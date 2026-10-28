import { SATS_PER_BTC } from "./constants";
import type {
  ActivityBucket,
  AddressInfo,
  AddressSummary,
  BalancePoint,
  Counterparty,
  MonthlyFlow,
  Tx,
  TxDelta,
  TxValuePoint,
  Utxo,
  UtxoSummary,
} from "./types";

/** What a single transaction did to one address: coins in, coins out, net. */
export function txDelta(tx: Tx, address: string): TxDelta {
  let received = 0;
  let sent = 0;
  for (const out of tx.vout) if (out.scriptpubkey_address === address) received += out.value;
  for (const input of tx.vin) if (input.prevout?.scriptpubkey_address === address) sent += input.prevout.value;
  return { received, sent, net: received - sent };
}

export const txTime = (tx: Tx, nowSec: number = Math.floor(Date.now() / 1000)): number =>
  tx.status.block_time ?? nowSec;

/** Current balance in sats, including unconfirmed activity. */
export function currentBalanceSats(info: AddressInfo): number {
  const c = info.chain_stats;
  const m = info.mempool_stats;
  return c.funded_txo_sum - c.spent_txo_sum + (m.funded_txo_sum - m.spent_txo_sum);
}

export function confirmedBalanceSats(info: AddressInfo): number {
  return info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
}

/**
 * Rebuilds the balance over time from the loaded transactions by walking
 * backwards from the known current balance. Correct even if only the most
 * recent N transactions are loaded.
 */
export function buildBalanceHistory(
  txs: Tx[],
  address: string,
  currentBalance: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): BalancePoint[] {
  if (txs.length === 0) return [];
  const sorted = [...txs].sort((a, b) => txTime(b, nowSec) - txTime(a, nowSec));
  const points: BalancePoint[] = [];
  let running = currentBalance;
  for (const tx of sorted) {
    points.push({ t: txTime(tx, nowSec), balance: running / SATS_PER_BTC });
    running -= txDelta(tx, address).net;
  }
  const oldest = txTime(sorted[sorted.length - 1], nowSec);
  points.push({ t: oldest - 1, balance: running / SATS_PER_BTC });
  return points.reverse();
}

const monthKey = (unixSeconds: number): string => new Date(unixSeconds * 1000).toISOString().slice(0, 7);

export function monthlyFlow(
  txs: Tx[],
  address: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): MonthlyFlow[] {
  const map = new Map<string, MonthlyFlow>();
  for (const tx of txs) {
    const key = monthKey(txTime(tx, nowSec));
    const d = txDelta(tx, address);
    const row = map.get(key) ?? { month: key, received: 0, sent: 0, txCount: 0 };
    // Count only the net direction so that "change" outputs don't inflate both bars.
    if (d.net > 0) row.received += d.net / SATS_PER_BTC;
    if (d.net < 0) row.sent += -d.net / SATS_PER_BTC;
    row.txCount += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function summarize(
  txs: Tx[],
  address: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): AddressSummary {
  let incoming = 0;
  let outgoing = 0;
  let largestIn = 0;
  let largestOut = 0;
  let totalAbs = 0;
  let fees = 0;
  let first: number | null = null;
  let last: number | null = null;

  for (const tx of txs) {
    const d = txDelta(tx, address);
    if (d.net > 0) {
      incoming += 1;
      largestIn = Math.max(largestIn, d.net);
    } else if (d.net < 0) {
      outgoing += 1;
      largestOut = Math.max(largestOut, -d.net);
    }
    if (d.sent > 0) fees += tx.fee;
    totalAbs += Math.abs(d.net);
    const t = txTime(tx, nowSec);
    first = first === null ? t : Math.min(first, t);
    last = last === null ? t : Math.max(last, t);
  }

  return {
    loadedTxs: txs.length,
    incomingCount: incoming,
    outgoingCount: outgoing,
    largestIncoming: largestIn,
    largestOutgoing: largestOut,
    averageValue: txs.length ? Math.round(totalAbs / txs.length) : 0,
    feesPaid: fees,
    firstSeen: first,
    lastActivity: last,
  };
}

/** Addresses this address transacts with most often. */
export function topCounterparties(txs: Tx[], address: string, limit = 5): Counterparty[] {
  const map = new Map<string, Counterparty>();
  const touch = (addr: string): Counterparty => {
    const row = map.get(addr) ?? { address: addr, txCount: 0, sentToSats: 0 };
    map.set(addr, row);
    return row;
  };

  for (const tx of txs) {
    const d = txDelta(tx, address);
    const seen = new Set<string>();
    if (d.net < 0) {
      for (const out of tx.vout) {
        const a = out.scriptpubkey_address;
        if (!a || a === address) continue;
        touch(a).sentToSats += out.value;
        seen.add(a);
      }
    } else {
      for (const input of tx.vin) {
        const a = input.prevout?.scriptpubkey_address;
        if (a && a !== address) seen.add(a);
      }
    }
    for (const a of seen) touch(a).txCount += 1;
  }

  return [...map.values()]
    .sort((a, b) => b.txCount - a.txCount || b.sentToSats - a.sentToSats)
    .slice(0, limit);
}

export function addressType(address: string): string {
  if (address.startsWith("1")) return "P2PKH (legacy)";
  if (address.startsWith("3")) return "P2SH (script or wrapped SegWit)";
  if (address.startsWith("bc1q")) return address.length === 42 ? "P2WPKH (native SegWit)" : "P2WSH (native SegWit script)";
  if (address.startsWith("bc1p")) return "P2TR (Taproot)";
  return "Unknown";
}

/** Net effect of each transaction on the address, oldest first (BTC, negative = outgoing). */
export function txValueSeries(
  txs: Tx[],
  address: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): TxValuePoint[] {
  return txs
    .map((tx) => ({ t: txTime(tx, nowSec), value: txDelta(tx, address).net / SATS_PER_BTC }))
    .sort((a, b) => a.t - b.t);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function activityByWeekday(txs: Tx[], nowSec: number = Math.floor(Date.now() / 1000)): ActivityBucket[] {
  const buckets = WEEKDAYS.map((label) => ({ label, count: 0 }));
  for (const tx of txs) buckets[new Date(txTime(tx, nowSec) * 1000).getUTCDay()].count += 1;
  return buckets;
}

export function activityByHour(txs: Tx[], nowSec: number = Math.floor(Date.now() / 1000)): ActivityBucket[] {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, "0"), count: 0 }));
  for (const tx of txs) buckets[new Date(txTime(tx, nowSec) * 1000).getUTCHours()].count += 1;
  return buckets;
}

const DUST_SATS = 1000;

export function summarizeUtxos(utxos: Utxo[]): UtxoSummary {
  if (utxos.length === 0) {
    return { count: 0, total: 0, largest: 0, smallest: 0, average: 0, dustCount: 0, oldest: null };
  }
  const values = utxos.map((u) => u.value);
  const total = values.reduce((a, b) => a + b, 0);
  const times = utxos.map((u) => u.status.block_time).filter((t): t is number => typeof t === "number");
  return {
    count: utxos.length,
    total,
    largest: Math.max(...values),
    smallest: Math.min(...values),
    average: Math.round(total / utxos.length),
    dustCount: values.filter((v) => v < DUST_SATS).length,
    oldest: times.length ? Math.min(...times) : null,
  };
}
