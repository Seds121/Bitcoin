import { SATS_PER_BTC } from "./constants";

export const satsToBtc = (sats: number): number => sats / SATS_PER_BTC;

export function formatBtc(sats: number, opts: { signed?: boolean; unit?: boolean } = {}): string {
  const { signed = false, unit = true } = opts;
  const abs = Math.abs(sats) / SATS_PER_BTC;
  const body = abs.toFixed(8);
  const sign = signed ? (sats > 0 ? "+" : sats < 0 ? "-" : "") : sats < 0 ? "-" : "";
  return `${sign}${body}${unit ? " BTC" : ""}`;
}

export function formatUsd(value: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function shortHash(hash: string, head = 8, tail = 8): string {
  return hash.length <= head + tail + 1 ? hash : `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function timeAgo(unixSeconds: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, Math.floor(nowMs / 1000 - unixSeconds));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 60) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 730) return `${Math.floor(diff / 86400 / 30)}mo ago`;
  return `${Math.floor(diff / 86400 / 365)}y ago`;
}

export function feeRate(fee: number, weight: number): number {
  const vsize = weight / 4;
  return vsize > 0 ? fee / vsize : 0;
}
