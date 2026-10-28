"use client";

import Link from "next/link";
import { useAddressUtxos } from "@/hooks/useAddress";
import { MAX_UTXO_LIST } from "@/lib/constants";
import { formatBtc, formatDate, formatNumber } from "@/lib/format";
import { txHref } from "@/lib/routes";
import { ErrorState, LoadingBlock, Panel } from "./Ui";

export function UtxoPanel({ address, count }: { address: string; count: number }) {
  const u = useAddressUtxos(address, count);

  let body;
  if (count === 0) body = <p className="muted">This address holds no unspent outputs.</p>;
  else if (u.tooMany)
    body = (
      <p className="muted">
        This address has {formatNumber(count)} unspent outputs, which is too many to list (limit {MAX_UTXO_LIST}).
        Its balance and totals above are still exact.
      </p>
    );
  else if (u.isLoading) body = <LoadingBlock />;
  else if (u.error) body = <ErrorState error={u.error} retry={() => u.refetch()} />;
  else if (u.summary)
    body = (
      <>
        <dl className="facts">
          <div><dt>Outputs</dt><dd className="mono">{formatNumber(u.summary.count)}</dd></div>
          <div><dt>Largest</dt><dd className="mono">{formatBtc(u.summary.largest)}</dd></div>
          <div><dt>Smallest</dt><dd className="mono">{formatBtc(u.summary.smallest)}</dd></div>
          <div><dt>Average</dt><dd className="mono">{formatBtc(u.summary.average)}</dd></div>
          <div><dt>Dust outputs (under 1,000 sats)</dt><dd className="mono">{formatNumber(u.summary.dustCount)}</dd></div>
          {u.summary.oldest && <div><dt>Oldest output</dt><dd>{formatDate(u.summary.oldest)}</dd></div>}
        </dl>
        <div className="table-wrap spaced">
          <table className="table">
            <thead>
              <tr><th>Largest outputs</th><th className="num">Index</th><th className="num">Value</th><th className="num">Confirmed</th></tr>
            </thead>
            <tbody>
              {u.largest.map((o) => (
                <tr key={`${o.txid}:${o.vout}`}>
                  <td><Link className="link mono" href={txHref(o.txid)}>{o.txid.slice(0, 12)}…{o.txid.slice(-8)}</Link></td>
                  <td className="num mono">{o.vout}</td>
                  <td className="num mono">{formatBtc(o.value, { unit: false })}</td>
                  <td className="num muted">{o.status.block_time ? formatDate(o.status.block_time) : "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );

  return <Panel title="Unspent outputs">{body}</Panel>;
}
