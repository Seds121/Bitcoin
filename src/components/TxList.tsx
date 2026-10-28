"use client";

import type { Tx } from "@/lib/types";
import { TxCard } from "./TxCard";

export function TxList({ txs, perspective, empty }: { txs: Tx[]; perspective?: string; empty?: string }) {
  if (txs.length === 0) return <p className="muted pad">{empty ?? "No transactions to show."}</p>;
  return (
    <div className="tx-list">
      {txs.map((tx) => (
        <TxCard key={tx.txid} tx={tx} perspective={perspective} />
      ))}
    </div>
  );
}
