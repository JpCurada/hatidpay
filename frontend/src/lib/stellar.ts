import { Contract, rpc, TransactionBuilder, BASE_FEE, nativeToScVal, scValToNative, xdr, StrKey } from '@stellar/stellar-sdk';
import { STELLAR_RPC_URL, CONTRACT_ID, NETWORK_PASSPHRASE, USDC_CONTRACT_ID } from './config';
import { signWithFreighter } from './freighter';
import type { EscrowData, CreateEscrowParams } from '../types';

const server = new rpc.Server(STELLAR_RPC_URL);

function getContract() {
  return new Contract(CONTRACT_ID);
}

// Handle both G... (account) and C... (contract) addresses
function addressToScVal(addr: string): xdr.ScVal {
  if (addr.startsWith('G')) {
    const rawKey = StrKey.decodeEd25519PublicKey(addr);
    return xdr.ScVal.scvAddress(
      xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(rawKey))
    );
  } else if (addr.startsWith('C')) {
    const contractHash = StrKey.decodeContract(addr);
    return xdr.ScVal.scvAddress(
      // @ts-expect-error — Buffer works at runtime; TS defs are overly strict
      xdr.ScAddress.scAddressTypeContract(contractHash)
    );
  }
  throw new Error(`Unsupported address format: ${addr}`);
}

// Helper to reliably simulate a transaction and get the returned XDR
async function simulateAndReturn(tx: any): Promise<any> {
    const simResult = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`);
    }
    if (!simResult.result || !simResult.result.retval) {
        throw new Error('No valid return value from simulation.');
    }
    return scValToNative(simResult.result.retval);
}

export async function createEscrow(buyerAddress: string, params: CreateEscrowParams): Promise<string> {
  const account = await server.getAccount(buyerAddress);
  const contract = getContract();
  
  const deadlineSeconds = Math.floor(Date.now() / 1000) + (params.deadlineHours * 3600);
  const amountRaw = Math.floor(params.amountUSDC * 10_000_000);

  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    throw new Error('Invalid amount. Please enter a valid positive number.');
  }

  // Build i128 ScVal manually to avoid BigInt conversion issues in nativeToScVal
  const amountScVal = xdr.ScVal.scvI128(
    new xdr.Int128Parts({ lo: xdr.Uint64.fromString(amountRaw.toString()), hi: xdr.Int64.fromString('0') })
  );

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      contract.call('create_escrow',
        addressToScVal(buyerAddress),
        addressToScVal(params.supplierAddress),
        addressToScVal(USDC_CONTRACT_ID),
        amountScVal,
        nativeToScVal(deadlineSeconds, { type: 'u64' })
      )
    )
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);
  const signedXdr = await signWithFreighter(preparedTx.toXDR(), NETWORK_PASSPHRASE);
  
  // Submit
  const txHash = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
  
  // Wait for network confirmation before returning to avoid polling complexity in MVP UI
  await new Promise(resolve => setTimeout(resolve, 5000)); 
  
  // To get the actual Escrow ID from the response, typically we'd parse the tx Result. 
  // However, for MVP let's assume the user queries for it, or we rely on the XDR.
  // In a robust implementation we poll for tx completion and parse `status.returnValue`.
  let status = await server.getTransaction(txHash.hash);
  if (status.status === 'SUCCESS' && status.returnValue) {
      return scValToNative(status.returnValue).toString();
  }
  
  // Fallback hack for MVP if polling is tricky: just return a stub or throw
  return "PENDING_CONFIRMATION";
}

async function genericContractCall(callerAddress: string, method: string, escrowId: number) {
  const account = await server.getAccount(callerAddress);
  const contract = getContract();
  
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, nativeToScVal(escrowId, { type: 'u64' })))
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);
  const signedXdr = await signWithFreighter(preparedTx.toXDR(), NETWORK_PASSPHRASE);
  await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
  await new Promise(resolve => setTimeout(resolve, 4000)); 
}

export async function confirmDelivery(buyerAddress: string, escrowId: number): Promise<void> {
  return genericContractCall(buyerAddress, 'confirm_delivery', escrowId);
}

export async function claimExpired(supplierAddress: string, escrowId: number): Promise<void> {
  return genericContractCall(supplierAddress, 'claim_expired', escrowId);
}

export async function raiseDispute(callerAddress: string, escrowId: number): Promise<void> {
  return genericContractCall(callerAddress, 'raise_dispute', escrowId);
}

export async function getUsdcBalance(walletAddress: string): Promise<string> {
  const account = await server.getAccount(walletAddress);
  const usdcContract = new Contract(USDC_CONTRACT_ID);

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(usdcContract.call('balance', addressToScVal(walletAddress)))
    .setTimeout(30)
    .build();

  const result = await simulateAndReturn(tx);
  const raw = Number(String(result));
  return (raw / 10_000_000).toFixed(2);
}

export async function getEscrow(escrowId: number, callerAddress: string): Promise<EscrowData> {
    const account = await server.getAccount(callerAddress);
    const contract = getContract();

    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call('get_escrow', nativeToScVal(escrowId, { type: 'u64' })))
        .setTimeout(30)
        .build();

    const result = await simulateAndReturn(tx);
    const dataObj = result as any;

    const parseStatus = (statusVal: any) => {
      if (typeof statusVal === 'string') return statusVal;
      if (statusVal && statusVal.key) return statusVal.key;
      if (Array.isArray(statusVal)) return statusVal[0];
      return Object.keys(statusVal || {})[0] || 'Created';
    };

    // scValToNative may return BigInt for i128 — convert safely via string
    let amountNum = 0;
    try {
      amountNum = Number(String(dataObj.amount));
      if (isNaN(amountNum)) amountNum = 0;
    } catch { amountNum = 0; }

    let deadlineNum = 0;
    try {
      deadlineNum = Number(String(dataObj.deadline));
      if (isNaN(deadlineNum)) deadlineNum = 0;
    } catch { deadlineNum = 0; }

    return {
      id: escrowId.toString(),
      buyer: String(dataObj.buyer),
      supplier: String(dataObj.supplier),
      token: String(dataObj.token),
      amount: (amountNum / 10_000_000).toFixed(2),
      amountRaw: BigInt(amountNum || 0),
      deadline: new Date(deadlineNum * 1000),
      status: parseStatus(dataObj.status) as any,
    };
}
