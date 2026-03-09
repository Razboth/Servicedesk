// Claim type definitions for ATM and CRM transactions

export type TransactionType = 'WITHDRAWAL' | 'DEPOSIT';

// Withdrawal claim types (existing ATM claims)
export const WITHDRAWAL_CLAIM_TYPES = [
  { value: 'CARD_CAPTURED', label: 'Kartu Tertelan' },
  { value: 'CASH_NOT_DISPENSED', label: 'Uang Tidak Keluar' },
  { value: 'WRONG_AMOUNT', label: 'Nominal Tidak Sesuai' },
  { value: 'DOUBLE_DEBIT', label: 'Terdebet Ganda' },
  { value: 'TIMEOUT', label: 'Transaksi Timeout' },
  { value: 'OTHER', label: 'Lainnya' }
] as const;

// Deposit claim types (CRM Setor Tunai)
export const DEPOSIT_CLAIM_TYPES = [
  { value: 'SALDO_BELUM_MASUK', label: 'Saldo Belum Masuk' },
  { value: 'NOMINAL_TIDAK_SESUAI', label: 'Nominal Tidak Sesuai' },
  { value: 'UANG_TIDAK_KEMBALI', label: 'Uang Ditolak/Tidak Kembali' },
  { value: 'MESIN_ERROR', label: 'Mesin Error' }
] as const;

// Combined for validation
export const ALL_CLAIM_TYPES = [...WITHDRAWAL_CLAIM_TYPES, ...DEPOSIT_CLAIM_TYPES];

// Transaction type labels
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  WITHDRAWAL: 'Penarikan Tunai',
  DEPOSIT: 'Setor Tunai'
};

// Get claim types based on transaction type
export function getClaimTypes(transactionType: TransactionType) {
  return transactionType === 'DEPOSIT' ? DEPOSIT_CLAIM_TYPES : WITHDRAWAL_CLAIM_TYPES;
}

// Validate claim type matches transaction type
export function isValidClaimType(claimType: string, transactionType: TransactionType): boolean {
  const validTypes = getClaimTypes(transactionType);
  return validTypes.some(t => t.value === claimType);
}

// Get claim type label
export function getClaimTypeLabel(claimType: string): string {
  const found = ALL_CLAIM_TYPES.find(t => t.value === claimType);
  return found?.label || claimType;
}
