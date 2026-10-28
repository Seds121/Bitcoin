"use client";

import Link from "next/link";
import { useState } from "react";
import { Charts } from "./homeCharts";
import { SearchBar } from "@/components/SearchBar";
import { ErrorState, LoadingBlock, Panel, Stat } from "@/components/Ui";
import {
  useBtcPrice,
  useLatestBlocks,
  useMempool,
  useRecentMempool,
  useRecommendedFees,
  useTipHeight,
} from "@/hooks/useNetwork";
import { useRecentSearches, useWatchlist } from "@/hooks/useStoredLists";
import { SAMPLE_ADDRESS } from "@/lib/constants";
import { feeRate, formatBtc, formatBytes, formatDate, formatNumber, formatUsd, satsToBtc, timeAgo } from "@/lib/format";
import { MAX_SUPPLY_SATS, blockSubsidySats, circulatingSupplySats, nextHalving } from "@/lib/market";
import { addressHref, blockHref, txHref } from "@/lib/routes";

function NetworkStats() {
  const price = useBtcPrice();
  const tip = useTipHeight();
  const mempool = useMempool();
  const height = tip.data;
  const supply = height != null ? circulatingSupplySats(height) : null;
  const usd = price.data?.USD;

  return (
    <div className="stat-grid">
      <Stat
        label="Bitcoin price"
        value={usd ? formatUsd(usd) : "…"}
        sub={price.data ? `${formatNumber(Math.round(price.data.EUR))} EUR · ${formatNumber(Math.round(price.data.GBP))} GBP` : undefined}
        tone="accent"
      />
      <Stat
        label="Market cap (approx.)"
        value={supply != null && usd ? formatUsd(satsToBtc(supply) * usd, true) : "…"}
        sub={supply != null ? `${((supply / MAX_SUPPLY_SATS) * 100).toFixed(2)}% of 21M issued` : undefined}
      />
      <Stat
        label="Block height"
        value={height != null ? formatNumber(height) : "…"}
        sub={height != null ? `Reward ${formatBtc(blockSubsidySats(height))}` : undefined}
      />
      <Stat
        label="Unconfirmed transactions"
        value={mempool.data ? formatNumber(mempool.data.count) : "…"}
        sub={mempool.data ? `${formatBytes(mempool.data.vsize)} waiting · ${formatBtc(mempool.data.total_fee)} in fees` : undefined}
      />
    </div>
  );
}

function FeesAndHalving() {
  const fees = useRecommendedFees();
  const tip = useTipHeight();
  const h = tip.data != null ? nextHalving(tip.data) : null;
  const supply = tip.data != null ? circulatingSupplySats(tip.data) : null;
  return (
    <div className="two-col">
      <Panel title="Fee rates (sat/vB)">
        {fees.data ? (
          <dl className="facts">
            <div><dt>Next block</dt><dd className="mono">{fees.data.fastestFee}</dd></div>
            <div><dt>About 30 minutes</dt><dd className="mono">{fees.data.halfHourFee}</dd></div>
            <div><dt>About an hour</dt><dd className="mono">{fees.data.hourFee}</dd></div>
            <div><dt>Economy</dt><dd className="mono">{fees.data.economyFee}</dd></div>
            <div><dt>Minimum relay</dt><dd className="mono">{fees.data.minimumFee}</dd></div>
          </dl>
        ) : fees.error ? (
          <ErrorState error={fees.error} retry={() => fees.refetch()} />
        ) : (
          <LoadingBlock />
        )}
      </Panel>
      <Panel title="Supply and halving">
        {h && supply != null ? (
          <>
            <dl className="facts">
              <div><dt>Coins issued</dt><dd className="mono">{formatBtc(supply, { unit: false })}</dd></div>
              <div><dt>Still to be mined</dt><dd className="mono">{formatBtc(MAX_SUPPLY_SATS - supply, { unit: false })}</dd></div>
              <div><dt>Next halving at block</dt><dd className="mono">{formatNumber(h.targetHeight)}</dd></div>
              <div><dt>Blocks remaining</dt><dd className="mono">{formatNumber(h.blocksLeft)}</dd></div>
              <div><dt>Estimated date</dt><dd>{formatDate(h.etaSec)}</dd></div>
              <div><dt>Reward after halving</dt><dd className="mono">{formatBtc(h.newSubsidy)}</dd></div>
            </dl>
            <div className="meter" role="img" aria-label={`${(h.progress * 100).toFixed(1)}% of this halving period complete`}>
              <div style={{ width: `${h.progress * 100}%` }} />
            </div>
          </>
        ) : (
          <LoadingBlock />
        )}
      </Panel>
    </div>
  );
}

function LatestBlocks() {
  const { data, isLoading, error, refetch } = useLatestBlocks();
  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  const blocks = (data ?? []).slice(0, 10);
  const hasPool = blocks.some((b) => b.extras?.pool?.name);
  const hasFees = blocks.some((b) => b.extras?.totalFees != null);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Height</th>
            <th>Mined</th>
            <th className="num">Gap</th>
            {hasPool && <th>Miner</th>}
            <th className="num">Transactions</th>
            <th className="num">Size</th>
            <th className="num">Full</th>
            {hasFees && <th className="num">Fees</th>}
          </tr>
        </thead>
        <tbody>
          {blocks.map((b, i) => {
            const prev = blocks[i + 1];
            return (
              <tr key={b.id}>
                <td><Link className="link mono" href={blockHref(b.height)}>{formatNumber(b.height)}</Link></td>
                <td className="muted">{timeAgo(b.timestamp)}</td>
                <td className="num mono">{prev ? `${Math.max(0, Math.round((b.timestamp - prev.timestamp) / 60))} min` : "—"}</td>
                {hasPool && <td>{b.extras?.pool?.name ?? "Unknown"}</td>}
                <td className="num mono">{formatNumber(b.tx_count)}</td>
                <td className="num mono">{formatBytes(b.size)}</td>
                <td className="num mono">{Math.min(100, (b.weight / 4_000_000) * 100).toFixed(0)}%</td>
                {hasFees && <td className="num mono">{b.extras?.totalFees != null ? formatBtc(b.extras.totalFees, { unit: false }) : "—"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecentTransactions() {
  const { data, isLoading, error, refetch } = useRecentMempool();
  const { data: price } = useBtcPrice();
  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Transaction</th><th className="num">Value</th><th className="num">USD</th><th className="num">Fee rate</th><th className="num">Size</th></tr>
        </thead>
        <tbody>
          {(data ?? []).slice(0, 10).map((t) => (
            <tr key={t.txid}>
              <td><Link className="link mono" href={txHref(t.txid)}>{t.txid.slice(0, 12)}…{t.txid.slice(-8)}</Link></td>
              <td className="num mono">{formatBtc(t.value, { unit: false })}</td>
              <td className="num mono">{price ? formatUsd(satsToBtc(t.value) * price.USD) : "—"}</td>
              <td className="num mono">{feeRate(t.fee, t.vsize * 4).toFixed(1)} sat/vB</td>
              <td className="num mono">{formatBytes(t.vsize)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shortcuts() {
  const recent = useRecentSearches();
  const watch = useWatchlist();
  const hrefFor = (kind: string, value: string) => (kind === "address" ? addressHref(value) : kind === "tx" ? txHref(value) : blockHref(value));
  return (
    <div className="shortcuts">
      <p className="muted">
        Try the first-ever Bitcoin address:{" "}
        <Link href={addressHref(SAMPLE_ADDRESS)} className="mono link">
          {SAMPLE_ADDRESS}
        </Link>
      </p>
      {recent.items.length > 0 && (
        <div className="chips">
          <span className="muted">Recent</span>
          {recent.items.map((r) => (
            <Link key={r.value} className="chip mono" href={hrefFor(r.kind, r.value)}>
              {r.value.length > 18 ? `${r.value.slice(0, 8)}…${r.value.slice(-6)}` : r.value}
            </Link>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={recent.clear}>
            Clear
          </button>
        </div>
      )}
      {watch.items.length > 0 && (
        <p className="muted">
          You are watching {watch.items.length} address{watch.items.length === 1 ? "" : "es"}.{" "}
          <Link className="link" href="/watchlist">
            Open watchlist
          </Link>
        </p>
      )}
    </div>
  );
}

export function HomeView() {
  const [days, setDays] = useState(30);
  return (
    <>
      <section className="hero">
        <h1>Look up any Bitcoin address, transaction or block.</h1>
        <p className="lede">Paste it below to see the balance, every transaction, charts of money in and out, and who it deals with.</p>
        <SearchBar size="lg" autoFocus />
        <Shortcuts />
      </section>

      <NetworkStats />

      <Panel title="Bitcoin price (USD)" action={<Charts.PriceTabs days={days} onChange={setDays} />}>
        <Charts.Price days={days} />
      </Panel>

      <FeesAndHalving />

      <Panel title="Latest blocks">
        <LatestBlocks />
      </Panel>

      <Panel title="Latest unconfirmed transactions">
        <RecentTransactions />
      </Panel>
    </>
  );
}
