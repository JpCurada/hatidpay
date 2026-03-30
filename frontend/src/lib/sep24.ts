import { signWithFreighter } from './freighter';

const ANCHOR_ORIGIN = 'https://testanchor.stellar.org';
const TOML_URL = `${ANCHOR_ORIGIN}/.well-known/stellar.toml`;

// In dev, route anchor requests through Vite proxy to avoid CORS
function proxyUrl(url: string): string {
  return url.replace(ANCHOR_ORIGIN, '/anchor');
}

// Minimal TOML parser for top-level string key="value" pairs
function parseTomlStrings(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^(\w+)\s*=\s*"(.+)"/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

export interface AnchorConfig {
  webAuthEndpoint: string;
  sep24Endpoint: string;
}

export async function getAnchorConfig(): Promise<AnchorConfig> {
  const res = await fetch(proxyUrl(TOML_URL));
  const text = await res.text();
  const toml = parseTomlStrings(text);
  return {
    webAuthEndpoint: toml['WEB_AUTH_ENDPOINT'],
    sep24Endpoint: toml['TRANSFER_SERVER_SEP0024'],
  };
}

export async function getSep10Token(
  walletAddress: string,
  webAuthEndpoint: string
): Promise<string> {
  // 1. Fetch challenge transaction
  const challengeRes = await fetch(`${proxyUrl(webAuthEndpoint)}?account=${walletAddress}`);
  if (!challengeRes.ok) throw new Error('Failed to fetch SEP-10 challenge.');
  const { transaction, network_passphrase } = await challengeRes.json();

  // 2. Sign with Freighter
  const signedXdr = await signWithFreighter(transaction, network_passphrase);

  // 3. Submit signed challenge to get JWT
  const tokenRes = await fetch(proxyUrl(webAuthEndpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signedXdr }),
  });
  if (!tokenRes.ok) throw new Error('SEP-10 authentication failed.');
  const { token } = await tokenRes.json();
  return token;
}

export interface DepositResult {
  url: string;
  id: string;
}

export async function initiateDeposit(
  walletAddress: string,
  assetCode: string,
  sep24Endpoint: string,
  jwt: string
): Promise<DepositResult> {
  const body = new URLSearchParams({
    asset_code: assetCode,
    account: walletAddress,
  });

  const res = await fetch(`${proxyUrl(sep24Endpoint)}/transactions/deposit/interactive`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error('Failed to initiate SEP-24 deposit.');
  const data = await res.json();
  return { url: data.url, id: data.id };
}

export type DepositStatus =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'completed'
  | 'error';

export async function getTransactionStatus(
  transactionId: string,
  sep24Endpoint: string,
  jwt: string
): Promise<DepositStatus> {
  const res = await fetch(`${proxyUrl(sep24Endpoint)}/transaction?id=${transactionId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) return 'error';
  const data = await res.json();
  return data.transaction?.status ?? 'error';
}
