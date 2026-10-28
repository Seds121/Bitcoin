"use client";

import Link from "next/link";
import { TxList } from "@/components/TxList";
import { CopyButton, ErrorState, LoadingBlock, Panel, Stat } from "@/components/Ui";
import { useBlock, useBlockTransactions } from "@/hooks/useBlock";
import { formatBtc, formatBytes, formatDateTime, formatNumber } from "@/lib/format";
import { analyzeCoinbase } from "@/lib/coinbase";
import { useTipHeight } from "@/hooks/useNetwork";
import { blockHref } from "@/lib/routes";

export function BlockView({ id }: { id: string }) {
  const { block, isLoading, error } = useBlock(id);
  const txs = useBlockTransactions(block?.id, block?.tx_count);
  const { data: tip } = useTipHeight();

  if (isLoading) return <LoadingBlock label="Loading block" />;
  if (error || !block) return <ErrorState error={error} />;

  const list = txs.data?.pages.flat() ?? [];
  const coinbase = list[0] ? analyzeCoinbase(list[0], block.height) : null;
  const confirmations = tip ? tip - block.height + 1 : null;

  return (
    <>
      <header className="page-head">
        <p className="kicker">Block {formatNumber(block.height)}</p>
        <h1 className="mono break">{block.id}</h1>
        <div className="actions">
          <CopyButton text={block.id} label="Copy hash" />
          {block.height > 0 && (
            <Link className="btn btn-sm" href={blockHref(block.height - 1)}>
              Previous block
            </Link>
          )}
          <Link className="btn btn-sm" href={blockHref(block.height + 1)}>
            Next block
          </Link>
        </div>
      </header>

      <div className="stat-grid">
        <Stat label="Mined" value={formatDateTime(block.timestamp)} />
        <Stat label="Transactions" value={formatNumber(block.tx_count)} tone="accent" />
        <Stat label="Size" value={formatBytes(block.size)} sub={`${formatNumber(block.weight)} weight units`} />
 <Stat label="Confirmations" value={confirmations != null ? formatNumber(confirmations) : "…"} />
        {coinbase && <Stat label="Block reward" value={formatBtc(coinbase.reward)} sub={`${formatBtc(coinbase.subsidy)} subsidy + ${formatBtc(coinbase.fees)} fees`} />}
        {coinbase && <Stat label="Miner" value={coinbase.pool ?? "Unidentified"} sub="from the coinbase text" />}
        <Stat label="Difficulty" value={Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(block.difficulty)} />
      </div>

      <Panel title="Details">
        <dl className="facts">
          <div><dt>Merkle root</dt><dd className="mono break">{block.merkle_root}</dd></div>
          {block.height > 0 && (
            <div>
              <dt>Previous block</dt>
              <dd><Link className="link mono break" href={blockHref(block.previousblockhash)}>{block.previousblockhash}</Link></dd>
            </div>
          )}
          <div><dt>Block fullness</dt><dd className="mono">{Math.min(100, (block.weight / 4_000_000) * 100).toFixed(1)}%</dd></div>
          <div><dt>Average transaction size</dt><dd className="mono">{formatBytes(Math.round(block.size / Math.max(1, block.tx_count)))}</dd></div>
          {coinbase && block.tx_count > 1 && <div><dt>Average fee per transaction</dt><dd className="mono">{formatBtc(Math.round(coinbase.fees / (block.tx_count - 1)))}</dd></div>}
          {coinbase?.message && <div><dt>Coinbase text</dt><dd className="mono break">{coinbase.message}</dd></div>}
          <div><dt>Nonce</dt><dd className="mono">{formatNumber(block.nonce)}</dd></div>
          <div><dt>Version</dt><dd className="mono">{block.version}</dd></div>
        </dl>
      </Panel>

      <Panel title={`Transactions (${formatNumber(list.length)} of ${formatNumber(block.tx_count)})`}>
        {txs.isLoading ? <LoadingBlock /> : txs.error ? <ErrorState error={txs.error} retry={() => txs.refetch()} /> : <TxList txs={list} />}
        {txs.hasNextPage && (
          <div className="center pad">
            <button className="btn" onClick={() => txs.fetchNextPage()} disabled={txs.isFetchingNextPage}>
              {txs.isFetchingNextPage ? "Loading…" : "Load more transactions"}
            </button>
          </div>
        )}
      </Panel>
    </>
  );
}
