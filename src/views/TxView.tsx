"use client";

import Link from "next/link";
import { TxCard } from "@/components/TxCard";
import { TxTables } from "@/components/TxTables";
import { Badge, CopyButton, ErrorState, LoadingBlock, Panel, Stat } from "@/components/Ui";
import { useBtcPrice, useRecommendedFees, useTipHeight } from "@/hooks/useNetwork";
import { useTransaction } from "@/hooks/useTransaction";
import { feeRate, formatBtc, formatBytes, formatDateTime, formatNumber, formatUsd, satsToBtc } from "@/lib/format";
import { feePriority } from "@/lib/market";
import { blockHref } from "@/lib/routes";

const yesNo = (v: boolean) => (v ? "Yes" : "No");

export function TxView({ txid }: { txid: string }) {
  const { data: tx, isLoading, error, refetch } = useTransaction(txid);
  const { data: tip } = useTipHeight();
  const { data: price } = useBtcPrice();
  const { data: fees } = useRecommendedFees();

  if (isLoading) return <LoadingBlock label="Loading transaction" />;
  if (error || !tx) return <ErrorState error={error} retry={() => refetch()} />;

  const totalOut = tx.vout.reduce((n, o) => n + o.value, 0);
  const totalIn = tx.vin.reduce((n, i) => n + (i.prevout?.value ?? 0), 0);
  const coinbase = tx.vin.some((i) => i.is_coinbase);
  const confirmations = tx.status.confirmed && tip && tx.status.block_height ? tip - tx.status.block_height + 1 : 0;
  const vsize = Math.ceil(tx.weight / 4);
  const rate = feeRate(tx.fee, tx.weight);
  const usd = price?.USD;
  const rbf = tx.vin.some((i) => i.sequence < 0xfffffffe);
  const segwit = tx.vin.some((i) => /^v\d/.test(i.prevout?.scriptpubkey_type ?? ""));
  const taproot = [...tx.vin.map((i) => i.prevout?.scriptpubkey_type), ...tx.vout.map((o) => o.scriptpubkey_type)].includes("v1_p2tr");

  return (
    <>
      <header className="page-head">
        <p className="kicker">Transaction</p>
        <h1 className="mono break">{tx.txid}</h1>
        <div className="actions">
          <CopyButton text={tx.txid} label="Copy ID" />
          {tx.status.confirmed ? <Badge tone="ok">Confirmed</Badge> : <Badge tone="wait">Unconfirmed</Badge>}
        </div>
      </header>

      <div className="stat-grid">
        <Stat label="Total output" value={formatBtc(totalOut)} sub={usd ? formatUsd(satsToBtc(totalOut) * usd) : undefined} tone="accent" />
        <Stat
          label="Fee"
          value={coinbase ? "None (coinbase)" : formatBtc(tx.fee)}
          sub={coinbase ? undefined : `${rate.toFixed(2)} sat/vB${usd ? ` · ${formatUsd(satsToBtc(tx.fee) * usd)}` : ""}`}
        />
        <Stat label="Confirmations" value={formatNumber(confirmations)} sub={tx.status.block_time ? formatDateTime(tx.status.block_time) : "waiting for a block"} />
        <Stat label="Size" value={`${formatBytes(tx.size)}`} sub={`${formatNumber(vsize)} vB · ${formatNumber(tx.weight)} weight units`} />
      </div>

      <Panel title="Inputs and outputs">
        <TxCard tx={tx} />
      </Panel>

      <Panel title="Input and output details">
        <TxTables tx={tx} usdPrice={usd} />
      </Panel>

      <Panel title="Details">
        <dl className="facts">
          {tx.status.block_height != null && tx.status.block_hash && (
            <div>
              <dt>Included in block</dt>
              <dd><Link className="link mono" href={blockHref(tx.status.block_height)}>{formatNumber(tx.status.block_height)}</Link></dd>
            </div>
          )}
          {!tx.status.confirmed && fees && !coinbase && (
            <div><dt>Expected confirmation at this fee rate</dt><dd>{feePriority(rate, fees)}</dd></div>
          )}
          {!coinbase && <div><dt>Total input</dt><dd className="mono">{formatBtc(totalIn)}</dd></div>}
          <div><dt>Total output</dt><dd className="mono">{formatBtc(totalOut)}</dd></div>
          <div><dt>Inputs</dt><dd className="mono">{tx.vin.length}</dd></div>
          <div><dt>Outputs</dt><dd className="mono">{tx.vout.length}</dd></div>
          <div><dt>SegWit</dt><dd>{yesNo(segwit)}</dd></div>
          <div><dt>Taproot</dt><dd>{yesNo(taproot)}</dd></div>
          <div><dt>Replaceable (RBF)</dt><dd>{coinbase ? "No" : yesNo(rbf)}</dd></div>
          <div><dt>Version</dt><dd className="mono">{tx.version}</dd></div>
          <div><dt>Locktime</dt><dd className="mono">{formatNumber(tx.locktime)}</dd></div>
        </dl>
      </Panel>
    </>
  );
}
