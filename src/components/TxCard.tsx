"use client";

import Link from "next/link";
import { useState } from "react";
import { useTipHeight } from "@/hooks/useNetwork";
import { txDelta } from "@/lib/analytics";
import { feeRate, formatBtc, formatDateTime, formatNumber, timeAgo } from "@/lib/format";
import { addressHref, blockHref, txHref } from "@/lib/routes";
import type { Tx, TxOutput } from "@/lib/types";
import { Badge, HashLink } from "./Ui";

const COLLAPSED = 4;

function Party({ addr, type, value, me }: { addr?: string; type: string; value: number; me?: string }) {
  return (
    <li className="party">
      {addr ? (
        <Link href={addressHref(addr)} className={`mono link ${addr === me ? "me" : ""}`} title={addr}>
          {addr.length > 24 ? `${addr.slice(0, 12)}…${addr.slice(-10)}` : addr}
        </Link>
      ) : (
        <span className="muted">{type === "op_return" ? "OP_RETURN (data)" : "No address (non-standard script)"}</span>
      )}
      <span className="mono amount">{formatBtc(value, { unit: false })}</span>
    </li>
  );
}

function PartyList({ items, me, more, toggle, expanded }: {
  items: { addr?: string; type: string; value: number; coinbase?: boolean }[];
  me?: string;
  more: number;
  expanded: boolean;
  toggle: () => void;
}) {
  const visible = expanded ? items : items.slice(0, COLLAPSED);
  return (
    <ul className="parties">
      {visible.map((p, i) =>
        p.coinbase ? (
          <li key={i} className="party">
            <span className="muted">Coinbase (newly generated coins)</span>
          </li>
        ) : (
          <Party key={i} addr={p.addr} type={p.type} value={p.value} me={me} />
        ),
      )}
      {more > 0 && (
        <li>
          <button className="btn btn-ghost btn-sm" onClick={toggle}>
            {expanded ? "Show fewer" : `Show ${more} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

export function TxCard({ tx, perspective }: { tx: Tx; perspective?: string }) {
  const { data: tip } = useTipHeight();
  const [expanded, setExpanded] = useState(false);

  const confirmations = tx.status.confirmed && tip && tx.status.block_height ? tip - tx.status.block_height + 1 : 0;
  const delta = perspective ? txDelta(tx, perspective) : null;

  const inputs = tx.vin.map((i) => ({
    addr: i.prevout?.scriptpubkey_address,
    type: i.prevout?.scriptpubkey_type ?? "unknown",
    value: i.prevout?.value ?? 0,
    coinbase: i.is_coinbase,
  }));
  const outputs = tx.vout.map((o: TxOutput) => ({ addr: o.scriptpubkey_address, type: o.scriptpubkey_type, value: o.value }));
  const hiddenIn = Math.max(0, inputs.length - COLLAPSED);
  const hiddenOut = Math.max(0, outputs.length - COLLAPSED);

  return (
    <article className="tx">
      <header className="tx-head">
        <HashLink href={txHref(tx.txid)} hash={tx.txid} head={14} tail={14} />
        <div className="tx-meta">
          {tx.status.confirmed && tx.status.block_time ? (
            <span className="muted" title={formatDateTime(tx.status.block_time)}>
              {formatDateTime(tx.status.block_time)} · {timeAgo(tx.status.block_time)}
            </span>
          ) : null}
          {tx.status.confirmed ? (
            <Badge tone="ok">{confirmations > 0 ? `${formatNumber(confirmations)} confirmations` : "Confirmed"}</Badge>
          ) : (
            <Badge tone="wait">Unconfirmed</Badge>
          )}
        </div>
      </header>

      <div className="tx-io">
        <PartyList items={inputs} me={perspective} more={hiddenIn} expanded={expanded} toggle={() => setExpanded((v) => !v)} />
        <div className="tx-arrow" aria-hidden>
          →
        </div>
        <PartyList items={outputs} me={perspective} more={hiddenOut} expanded={expanded} toggle={() => setExpanded((v) => !v)} />
      </div>

      <footer className="tx-foot">
        <span className="muted">
          Fee <span className="mono">{formatBtc(tx.fee)}</span> · {feeRate(tx.fee, tx.weight).toFixed(1)} sat/vB
          {tx.status.block_height != null && (
            <>
              {" "}
              · Block{" "}
              <Link className="link" href={blockHref(tx.status.block_height)}>
                {formatNumber(tx.status.block_height)}
              </Link>
            </>
          )}
        </span>
        {delta && (
          <span className={`mono net ${delta.net >= 0 ? "in" : "out"}`}>{formatBtc(delta.net, { signed: true })}</span>
        )}
      </footer>
    </article>
  );
}
