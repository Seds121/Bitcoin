/**
 * Server-side allow-list for the mempool.space proxy. Only read-only
 * endpoints the app actually uses can be reached, so the route can't be
 * abused as an open proxy.
 */
const ADDR = "[A-Za-z0-9]{14,100}";
const HASH = "[a-fA-F0-9]{64}";

const ALLOWED: RegExp[] = [
  new RegExp(`^address/${ADDR}$`),
  new RegExp(`^address/${ADDR}/txs$`),
  new RegExp(`^address/${ADDR}/utxo$`),
  new RegExp(`^address/${ADDR}/txs/chain/${HASH}$`),
  new RegExp(`^tx/${HASH}$`),
  new RegExp(`^tx/${HASH}/outspends$`),
  new RegExp(`^block/${HASH}$`),
  new RegExp(`^block/${HASH}/txs/\\d{1,6}$`),
  /^block-height\/\d{1,7}$/,
  /^blocks\/tip\/height$/,
  /^mempool$/,
  /^mempool\/recent$/,
  /^v1\/prices$/,
  /^v1\/fees\/recommended$/,
  /^v1\/blocks$/,
];

export const isAllowedPath = (path: string): boolean => ALLOWED.some((re) => re.test(path));

/** Confirmed chain data is effectively immutable; live data is cached briefly. */
export function revalidateSeconds(path: string): number {
  if (path.endsWith("/outspends") || path.endsWith("/utxo")) return 30;
  if (path.startsWith("tx/") || path.startsWith("block/") || path.startsWith("block-height/")) return 300;
  return 20;
}
