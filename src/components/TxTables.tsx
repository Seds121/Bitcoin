"use client";

import Link from "next/link";
import { useOutspends } from "@/hooks/useTransaction";
import { formatBtc, formatUsd, satsToBtc } from "@/lib/format";
import { addressHref, txHref } from "@/lib/routes";
import type { Tx } from "@/lib/types";
import { Badge, Skeleton } from "./Ui";

const TYPES: Record<string, string> = {
  p2pkh: "P2PKH",
  p2sh: "P2SH",
  p2pk: "P2PK",
  v0_p2wpkh: "P2WPKH",
  v0_p2wsh: "P2WSH",
  v1_p2tr: "P2TR",
  op_return: "OP_RETURN",
  multisig: "Multisig",
};
export const typeLabel = (t: string) => TYPES[t] ?? t.toUpperCase();

const Addr = ({ a }: { a?: string }) =>
  a ? (
    <Link className="link mono break" href={addressHref(a)}>
      {a}
    </Link>
  ) : (
    <span className="muted">No address</span>
  );

export function TxTables({ tx, usdPrice }: { tx: Tx; usdPrice?: number }) {
  const spends = useOutspends(tx.txid);
  const usd = (sats: number) => (usdPrice ? formatUsd(satsToBtc(sats) * usdPrice) : "—");

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Input address</th><th>Type</th><th className="num">Value</th><th className="num">USD</th></tr>
          </thead>
          <tbody>
            {tx.vin.map((i, n) => (
              <tr key={n}>
                <td className="mono">{n}</td>
                <td>{i.is_coinbase ? <span className="muted">Coinbase (newly generated coins)</span> : <Addr a={i.prevout?.scriptpubkey_address} />}</td>
                <td className="mono">{i.prevout ? typeLabel(i.prevout.scriptpubkey_type) : "—"}</td>
                <td className="num mono">{i.prevout ? formatBtc(i.prevout.value, { unit: false }) : "—"}</td>
                <td className="num mono">{i.prevout ? usd(i.prevout.value) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap spaced">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Output address</th><th>Type</th><th className="num">Value</th><th className="num">USD</th><th>Status</th></tr>
          </thead>
          <tbody>
            {tx.vout.map((o, n) => {
              const sp = spends.data?.[n];
              return (
                <tr key={n}>
                  <td className="mono">{n}</td>
                  <td>
                    {o.scriptpubkey_address ? <Addr a={o.scriptpubkey_address} /> : <span className="muted">{o.scriptpubkey_type === "op_return" ? "OP_RETURN (data)" : "No address"}</span>}
                  </td>
                  <td className="mono">{typeLabel(o.scriptpubkey_type)}</td>
                  <td className="num mono">{formatBtc(o.value, { unit: false })}</td>
                  <td className="num mono">{usd(o.value)}</td>
                  <td>
                    {o.scriptpubkey_type === "op_return" ? (
                      <Badge tone="neutral">Not spendable</Badge>
                    ) : spends.isLoading ? (
                      <Skeleton width={60} />
                    ) : sp?.spent && sp.txid ? (
                      <Link href={txHref(sp.txid)}><Badge tone="out">Spent</Badge></Link>
                    ) : sp ? (
                      <Badge tone="in">Unspent</Badge>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
