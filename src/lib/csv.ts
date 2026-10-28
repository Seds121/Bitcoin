import { SATS_PER_BTC } from "./constants";
import { txDelta, txTime } from "./analytics";
import type { Tx } from "./types";

const esc = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function transactionsToCsv(txs: Tx[], address: string): string {
  const header = ["txid", "date_utc", "status", "block_height", "received_btc", "sent_btc", "net_btc", "fee_btc"];
  const rows = txs.map((tx) => {
    const d = txDelta(tx, address);
    return [
      tx.txid,
      new Date(txTime(tx) * 1000).toISOString(),
      tx.status.confirmed ? "confirmed" : "unconfirmed",
      tx.status.block_height ?? "",
      (d.received / SATS_PER_BTC).toFixed(8),
      (d.sent / SATS_PER_BTC).toFixed(8),
      (d.net / SATS_PER_BTC).toFixed(8),
      (tx.fee / SATS_PER_BTC).toFixed(8),
    ].map(esc).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}
