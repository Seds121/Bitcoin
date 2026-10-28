"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ActivityPanel } from "@/components/ActivityPanel";
import { BalanceChart, FlowChart, TxValueChart } from "@/components/Charts";
import { UtxoPanel } from "@/components/UtxoPanel";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { TxList } from "@/components/TxList";
import { CopyButton, ErrorState, LoadingBlock, Panel, Stat, Tabs } from "@/components/Ui";
import { WatchlistButton } from "@/components/WatchlistButton";
import { useAddressDashboard, type TxFilter } from "@/hooks/useAddress";
import { useBtcPrice } from "@/hooks/useNetwork";
import { addressType, txDelta } from "@/lib/analytics";
import { MAX_HISTORY_TXS } from "@/lib/constants";
import { formatBtc, formatDate, formatNumber, formatUsd, satsToBtc } from "@/lib/format";
import { addressHref } from "@/lib/routes";

export function AddressView({ address }: { address: string }) {
  const d = useAddressDashboard(address);
  const price = useBtcPrice();
  const [filter, setFilter] = useState<TxFilter>("all");

  const filtered = useMemo(
    () =>
      d.txs.filter((tx) => {
        if (filter === "all") return true;
        const net = txDelta(tx, address).net;
        return filter === "incoming" ? net > 0 : net < 0;
      }),
    [d.txs, filter, address],
  );

  if (d.info.isLoading) return <LoadingBlock label="Loading address" />;
  if (d.info.error || !d.info.data) return <ErrorState error={d.info.error} retry={() => d.info.refetch()} />;

  const { chain_stats: chain, mempool_stats: mem } = d.info.data;
  const usd = price.data?.USD;
  const usdValue = (sats: number) => (usd ? formatUsd(satsToBtc(sats) * usd) : undefined);
  const utxos = chain.funded_txo_count - chain.spent_txo_count;
  const s = d.analytics?.summary;

  return (
    <>
      <header className="page-head">
        <p className="kicker">Bitcoin address</p>
        <h1 className="mono break">{address}</h1>
        <div className="actions">
          <CopyButton text={address} label="Copy address" />
          <WatchlistButton address={address} />
        </div>
      </header>

      <div className="stat-grid">
        <Stat label="Balance" value={formatBtc(d.balanceSats)} sub={usdValue(d.balanceSats)} tone="accent" />
        <Stat label="Total received" value={formatBtc(chain.funded_txo_sum + mem.funded_txo_sum)} sub={usdValue(chain.funded_txo_sum + mem.funded_txo_sum)} tone="in" />
        <Stat label="Total sent" value={formatBtc(chain.spent_txo_sum + mem.spent_txo_sum)} sub={usdValue(chain.spent_txo_sum + mem.spent_txo_sum)} tone="out" />
        <Stat label="Transactions" value={formatNumber(d.totalTxCount)} sub={mem.tx_count > 0 ? `${mem.tx_count} unconfirmed` : "all confirmed"} />
        <Stat label="Unspent outputs" value={formatNumber(utxos + (mem.funded_txo_count - mem.spent_txo_count))} sub={`${formatNumber(chain.funded_txo_count)} received · ${formatNumber(chain.spent_txo_count)} spent`} />
        <Stat label="Address type" value={addressType(address)} />
        {price.data && <Stat label="Value in other currencies" value={`${formatNumber(Math.round(satsToBtc(d.balanceSats) * price.data.EUR))} EUR`} sub={`${formatNumber(Math.round(satsToBtc(d.balanceSats) * price.data.GBP))} GBP`} />}
        {d.confirmedSats !== d.balanceSats && <Stat label="Confirmed balance" value={formatBtc(d.confirmedSats)} sub="excludes unconfirmed" />}
      </div>

      {d.txQuery.isLoading ? (
        <LoadingBlock label="Loading transactions" />
      ) : d.txQuery.error ? (
        <ErrorState error={d.txQuery.error} retry={() => d.txQuery.refetch()} />
      ) : (
        <>
          <p className="muted scope-note">
            Charts and analytics use the {formatNumber(d.txs.length)} most recent of {formatNumber(d.totalTxCount)} transactions
            {d.historyComplete ? " (complete history)" : ""}.
            {d.hasMore && (
              <>
                {" "}
                <button className="link-btn" onClick={() => d.loadAll()} disabled={d.isFetchingMore}>
                  {d.isFetchingMore ? "Loading…" : `Load up to ${MAX_HISTORY_TXS}`}
                </button>
              </>
            )}
          </p>

          {d.analytics && d.analytics.balanceHistory.length > 1 && (
            <div className="two-col">
              <Panel title="Balance over time (BTC)">
                <BalanceChart data={d.analytics.balanceHistory} />
              </Panel>
              <Panel title="Received and sent per month (BTC)">
                <FlowChart data={d.analytics.monthly} />
              </Panel>
            </div>
          )}

          {d.analytics && d.analytics.valueSeries.length > 1 && (
            <div className="two-col">
              <Panel title="Amount of each transaction (BTC)">
                <TxValueChart data={d.analytics.valueSeries} />
              </Panel>
              <ActivityPanel weekday={d.analytics.weekday} hour={d.analytics.hour} />
            </div>
          )}

          {s && s.loadedTxs > 0 && (
            <div className="two-col">
              <Panel title="Activity">
                <dl className="facts">
                  <div><dt>Incoming transactions</dt><dd className="mono">{formatNumber(s.incomingCount)}</dd></div>
                  <div><dt>Outgoing transactions</dt><dd className="mono">{formatNumber(s.outgoingCount)}</dd></div>
                  <div><dt>Largest incoming</dt><dd className="mono">{formatBtc(s.largestIncoming)}</dd></div>
                  <div><dt>Largest outgoing</dt><dd className="mono">{formatBtc(s.largestOutgoing)}</dd></div>
                  <div><dt>Average transaction size</dt><dd className="mono">{formatBtc(s.averageValue)}</dd></div>
                  <div><dt>Fees paid on sends</dt><dd className="mono">{formatBtc(s.feesPaid)}</dd></div>
                  {s.firstSeen && <div><dt>{d.historyComplete ? "First seen" : "Oldest loaded"}</dt><dd>{formatDate(s.firstSeen)}</dd></div>}
                  {s.lastActivity && <div><dt>Last activity</dt><dd>{formatDate(s.lastActivity)}</dd></div>}
                </dl>
              </Panel>
              <Panel title="Most frequent counterparties">
                {d.analytics && d.analytics.counterparties.length > 0 ? (
                  <ul className="parties">
                    {d.analytics.counterparties.map((c) => (
                      <li key={c.address} className="party">
                        <Link className="link mono" href={addressHref(c.address)} title={c.address}>
                          {c.address.slice(0, 14)}…{c.address.slice(-8)}
                        </Link>
                        <span className="muted">{c.txCount} tx{c.sentToSats > 0 ? ` · received ${formatBtc(c.sentToSats)}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No repeated counterparties in the loaded transactions.</p>
                )}
              </Panel>
            </div>
          )}

          <UtxoPanel address={address} count={utxos} />

          <Panel
            title="Transactions"
            action={
              <div className="actions">
                <Tabs
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "incoming", label: "Incoming" },
                    { value: "outgoing", label: "Outgoing" },
                  ]}
                />
                <ExportCsvButton txs={filtered} address={address} />
              </div>
            }
          >
            <TxList txs={filtered} perspective={address} empty={d.txs.length ? "No transactions match this filter." : "This address has no transactions yet."} />
            {d.hasMore && (
              <div className="center pad">
                <button className="btn" onClick={() => d.loadMore()} disabled={d.isFetchingMore}>
                  {d.isFetchingMore ? "Loading…" : "Load more transactions"}
                </button>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
