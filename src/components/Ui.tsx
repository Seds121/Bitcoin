"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCopy } from "@/hooks/useCopy";
import { ApiError } from "@/lib/api";
import { shortHash } from "@/lib/format";

export function Panel({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      {(title || action) && (
        <header className="panel-head">
          <h2>{title}</h2>
          {action}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "in" | "out" | "accent";
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value mono ${tone ?? ""}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%" }: { height?: number; width?: number | string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <Skeleton height={14} width="40%" />
      <Skeleton height={14} width="75%" />
      <Skeleton height={14} width="60%" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof ApiError || error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="btn" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "wait" | "in" | "out" | "neutral"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => copy(text)} aria-live="polite">
      {copied ? "Copied" : label}
    </button>
  );
}

export function HashLink({ href, hash, head = 10, tail = 10 }: { href: string; hash: string; head?: number; tail?: number }) {
  return (
    <Link href={href} className="mono link" title={hash}>
      {shortHash(hash, head, tail)}
    </Link>
  );
}

export function Tabs<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? "tab active" : "tab"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
