import { Networks } from '@stellar/stellar-sdk';

export const STELLAR_RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || '';
export const USDC_CONTRACT_ID = import.meta.env.VITE_USDC_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

export const DEFAULT_DEADLINE_HOURS = 72;