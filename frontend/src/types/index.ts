export interface EscrowData {
  id: string;
  buyer: string;
  supplier: string;
  token: string;
  amount: string; // formatted USDC string, e.g. "50.00"
  amountRaw: bigint; // native mapping representation
  deadline: Date;
  status: 'Created' | 'Confirmed' | 'Expired' | 'Disputed';
}

export interface CreateEscrowParams {
  supplierAddress: string;
  amountUSDC: number;
  deadlineHours: number;
}
