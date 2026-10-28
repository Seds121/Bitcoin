export interface AddressStats {
  funded_txo_count: number;
  funded_txo_sum: number;
  spent_txo_count: number;
  spent_txo_sum: number;
  tx_count: number;
}

export interface AddressInfo {
  address: string;
  chain_stats: AddressStats;
  mempool_stats: AddressStats;
}

export interface TxStatus {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

export interface TxOutput {
  scriptpubkey: string;
  scriptpubkey_asm?: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface TxInput {
  txid: string;
  vout: number;
  prevout: TxOutput | null;
  scriptsig?: string;
  is_coinbase: boolean;
  sequence: number;
}

export interface Tx {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: TxInput[];
  vout: TxOutput[];
  status: TxStatus;
}

export interface Block {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  nonce: number;
  bits: number;
  difficulty: number;
  mediantime: number;
}

export interface BlockSummary {
  id: string;
  height: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  extras?: {
    totalFees?: number;
    reward?: number;
    pool?: { name: string };
  };
}

export interface Prices {
  time?: number;
  USD: number;
  EUR: number;
  GBP: number;
  [currency: string]: number | undefined;
}

export interface RecommendedFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface MempoolInfo {
  count: number;
  vsize: number;
  total_fee: number;
}

export interface PricePoint {
  t: number;
  price: number;
}

export type SearchKind = "address" | "tx" | "block";

export type SearchResult =
  | { ok: true; kind: SearchKind; value: string }
  | { ok: false; reason: string };

/* ---------- derived analytics ---------- */

export interface TxDelta {
  received: number;
  sent: number;
  net: number;
}

export interface BalancePoint {
  t: number;
  balance: number; // BTC
}

export interface MonthlyFlow {
  month: string; // YYYY-MM
  received: number; // BTC
  sent: number; // BTC (positive number)
  txCount: number;
}

export interface Counterparty {
  address: string;
  txCount: number;
  sentToSats: number;
}

export interface AddressSummary {
  loadedTxs: number;
  incomingCount: number;
  outgoingCount: number;
  largestIncoming: number; // sats
  largestOutgoing: number; // sats (positive)
  averageValue: number; // sats
  feesPaid: number; // sats
  firstSeen: number | null;
  lastActivity: number | null;
}

export interface Utxo {
  txid: string;
  vout: number;
  value: number;
  status: TxStatus;
}

export interface Outspend {
  spent: boolean;
  txid?: string;
  vin?: number;
  status?: TxStatus;
}

export interface MempoolRecentTx {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
}

export interface UtxoSummary {
  count: number;
  total: number;
  largest: number;
  smallest: number;
  average: number;
  dustCount: number;
  oldest: number | null;
}

export interface ActivityBucket {
  label: string;
  count: number;
}

export interface TxValuePoint {
  t: number;
  value: number; // BTC, negative = outgoing
}

export interface CoinbaseInfo {
  pool: string | null;
  message: string;
  subsidy: number;
  fees: number;
  reward: number;
}
