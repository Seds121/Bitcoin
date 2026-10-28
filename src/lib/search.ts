import type { SearchResult } from "./types";

const LEGACY = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BECH32 = /^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,87}$/;
const HEX64 = /^[a-fA-F0-9]{64}$/;
const HEIGHT = /^\d{1,7}$/;

/**
 * Works out what a user pasted into the search box:
 * a mainnet address, a transaction id, a block hash or a block height.
 */
export function classifyQuery(raw: string): SearchResult {
  let q = raw.trim();
  if (!q) return { ok: false, reason: "Enter an address, transaction ID, block hash or block height." };

  // Support payment URIs such as bitcoin:bc1q...?amount=0.1
  if (/^bitcoin:/i.test(q)) q = q.replace(/^bitcoin:/i, "").split("?")[0];

  if (HEIGHT.test(q)) return { ok: true, kind: "block", value: String(Number(q)) };

  if (HEX64.test(q)) {
    const hash = q.toLowerCase();
    // Block hashes always start with many zero nibbles (proof of work).
    return /^0{8}/.test(hash)
      ? { ok: true, kind: "block", value: hash }
      : { ok: true, kind: "tx", value: hash };
  }

  if (LEGACY.test(q)) return { ok: true, kind: "address", value: q };

  const lower = q.toLowerCase();
  if (/^bc1/i.test(q) && (q === lower || q === q.toUpperCase()) && BECH32.test(lower)) {
    return { ok: true, kind: "address", value: lower };
  }

  if (/^(tb1|bcrt1|[mn2])/i.test(q) && q.length > 25) {
    return { ok: false, reason: "Only Bitcoin mainnet is supported. This looks like a testnet address." };
  }

  return { ok: false, reason: "That doesn't look like a Bitcoin address, transaction ID, block hash or block height." };
}
