import { blockSubsidySats } from "./market";
import type { CoinbaseInfo, Tx } from "./types";

/** Best-effort pool detection from the text miners embed in the coinbase. */
const POOLS: [RegExp, string][] = [
  [/foundry usa/i, "Foundry USA"],
  [/antpool/i, "AntPool"],
  [/f2pool|🐟/i, "F2Pool"],
  [/viabtc/i, "ViaBTC"],
  [/binance/i, "Binance Pool"],
  [/mara pool|marapool/i, "MARA Pool"],
  [/luxor/i, "Luxor"],
  [/spiderpool/i, "SpiderPool"],
  [/braiins|slush/i, "Braiins Pool"],
  [/sbicrypto|sbi crypto/i, "SBI Crypto"],
  [/poolin/i, "Poolin"],
  [/btc\.com|btccom/i, "BTC.com"],
  [/ultimuspool|ultimus/i, "Ultimus"],
  [/ocean\.xyz|ocean/i, "OCEAN"],
  [/titan/i, "Titan"],
  [/secpool/i, "SECPOOL"],
  [/kucoin/i, "KuCoin Pool"],
  [/emcdpool|emcd/i, "EMCD"],
  [/bitfufu/i, "BitFuFu"],
  [/1thash/i, "1THash"],
  [/whitepool/i, "WhitePool"],
];

function printableRuns(hex: string): string {
  let text = "";
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    text += code >= 32 && code < 127 ? String.fromCharCode(code) : "\u0000";
  }
  return (text.match(/[ -~]{4,}/g) ?? []).join(" ").trim();
}

export function analyzeCoinbase(tx: Tx, height: number): CoinbaseInfo | null {
  const input = tx.vin[0];
  if (!input?.is_coinbase) return null;
  const message = printableRuns(input.scriptsig ?? "");
  const pool = POOLS.find(([re]) => re.test(message))?.[1] ?? null;
  const paid = tx.vout.reduce((n, o) => n + o.value, 0);
  const subsidy = blockSubsidySats(height);
  return { pool, message, subsidy, fees: Math.max(0, paid - subsidy), reward: paid };
}
