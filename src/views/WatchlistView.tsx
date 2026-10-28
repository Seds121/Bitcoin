"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Panel, Skeleton } from "@/components/Ui";
import { useAddressInfo } from "@/hooks/useAddress";
import { useBtcPrice } from "@/hooks/useNetwork";
import { useWatchlist, type WatchedAddress } from "@/hooks/useStoredLists";
import { currentBalanceSats } from "@/lib/analytics";
import { formatBtc, formatNumber, formatUsd, satsToBtc } from "@/lib/format";
import { classifyQuery } from "@/lib/search";
import { addressHref } from "@/lib/routes";

function Row({ item, onRemove }: { item: WatchedAddress; onRemove: () => void }) {
  const { data, isLoading, error } = useAddressInfo(item.address);
  const { data: price } = useBtcPrice();
  const sats = data ? currentBalanceSats(data) : 0;
  return (
    <tr>
      <td>
        {item.label && <div>{item.label}</div>}
        <Link className="link mono" href={addressHref(item.address)} title={item.address}>
          {item.address.length > 26 ? `${item.address.slice(0, 14)}…${item.address.slice(-10)}` : item.address}
        </Link>
      </td>
      <td className="num mono">{isLoading ? <Skeleton width={90} /> : error ? "—" : formatBtc(sats)}</td>
      <td className="num mono">{data && price ? formatUsd(satsToBtc(sats) * price.USD) : "—"}</td>
      <td className="num mono">{data ? formatNumber(data.chain_stats.tx_count + data.mempool_stats.tx_count) : "—"}</td>
      <td className="num">
        <button className="btn btn-ghost btn-sm" onClick={onRemove}>
          Remove
        </button>
      </td>
    </tr>
  );
}

export function WatchlistView() {
  const { items, add, remove } = useWatchlist();
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = classifyQuery(value);
    if (!result.ok || result.kind !== "address") {
      setError(result.ok ? "The watchlist tracks addresses only." : result.reason);
      return;
    }
    add(result.value, label);
    setValue("");
    setLabel("");
    setError(null);
  };

  return (
    <>
      <header className="page-head">
        <h1>Watchlist</h1>
        <p className="lede">Addresses you follow. Balances refresh every minute. The list is saved in this browser only.</p>
      </header>

      <Panel title="Add an address">
        <form className="watch-form" onSubmit={submit}>
          <input className="input" value={value} onChange={(e) => { setValue(e.target.value); setError(null); }} placeholder="Bitcoin address" aria-label="Bitcoin address" spellCheck={false} />
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" aria-label="Label" maxLength={40} />
          <button className="btn btn-primary" type="submit">Add address</button>
        </form>
        {error && <p className="field-error" role="alert">{error}</p>}
      </Panel>

      <Panel title={`Watching (${items.length})`}>
        {items.length === 0 ? (
          <p className="muted pad">No addresses yet. Add one above, or use the button on any address page.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th className="num">Balance</th>
                  <th className="num">Value (USD)</th>
                  <th className="num">Transactions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <Row key={i.address} item={i} onRemove={() => remove(i.address)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}


