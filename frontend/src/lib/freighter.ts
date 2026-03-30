import { isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';

export async function connectToFreighter(): Promise<string> {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error('Freighter is not installed or not connected. Please install the Freighter extension.');
  }
  
  // requestAccess prompts the user to grant the app access if not already granted
  const accessReq = await requestAccess();
  if (accessReq.error || !accessReq.address) {
    throw new Error(accessReq.error || 'Failed to retrieve public key from Freighter. Please approve the connection.');
  }

  return accessReq.address;
}

export async function signWithFreighter(xdr: string, networkPassphrase: string): Promise<string> {
  try {
    const signedXdr = await signTransaction(xdr, { networkPassphrase });
    if (signedXdr.error) throw new Error(signedXdr.error as any);
    return signedXdr.signedTxXdr;
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw new Error('Transaction signing was rejected or failed.');
  }
}
