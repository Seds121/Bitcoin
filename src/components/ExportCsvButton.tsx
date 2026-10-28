"use client";

import { transactionsToCsv } from "@/lib/csv";
import type { Tx } from "@/lib/types";

export function ExportCsvButton({ txs, address }: { txs: Tx[]; address: string }) {
  const download = () => {
    const blob = new Blob([transactionsToCsv(txs, address)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `btc-${address.slice(0, 10)}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button className="btn btn-sm" onClick={download} disabled={txs.length === 0}>
      Export CSV ({txs.length})
    </button>
  );
}
