import { describe, expect, it } from "vitest";
import { classifyQuery } from "../search";
import { buildBalanceHistory, monthlyFlow, summarize, topCounterparties, txDelta, currentBalanceSats } from "../analytics";
import { formatBtc, formatUsd, shortHash, feeRate } from "../format";
import { isAllowedPath } from "../proxy";
import { transactionsToCsv } from "../csv";
import type { Tx } from "../types";

const ME = "bc1qme00000000000000000000000000000000000";
const OTHER = "1BoatSLRHtKNngkdXEeobR76b53LETtpyT";
const ID = "a".repeat(64);

function mkTx(opts: { txid?: string; time: number; ins?: [string, number][]; outs: [string, number][]; fee?: number }): Tx {
  return {
    txid: opts.txid ?? ID,
    version: 2,
    locktime: 0,
    size: 200,
    weight: 800,
    fee: opts.fee ?? 1000,
    vin: (opts.ins ?? []).map(([a, v], i) => ({
      txid: "b".repeat(64),
      vout: i,
      is_coinbase: false,
      sequence: 0,
      prevout: { scriptpubkey: "", scriptpubkey_type: "p2wpkh", scriptpubkey_address: a, value: v },
    })),
    vout: opts.outs.map(([a, v]) => ({ scriptpubkey: "", scriptpubkey_type: "p2wpkh", scriptpubkey_address: a, value: v })),
    status: { confirmed: true, block_height: 1, block_time: opts.time },
  };
}

describe("classifyQuery", () => {
  it("detects legacy and bech32 addresses", () => {
    expect(classifyQuery("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toMatchObject({ ok: true, kind: "address" });
    expect(classifyQuery("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toMatchObject({ ok: true, kind: "address" });
  });
  it("normalises upper-case bech32 and payment URIs", () => {
    const r = classifyQuery("bitcoin:BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ?amount=1");
    expect(r).toEqual({ ok: true, kind: "address", value: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" });
  });
  it("tells block hashes, txids and heights apart", () => {
    expect(classifyQuery("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f")).toMatchObject({ kind: "block" });
    expect(classifyQuery(ID)).toMatchObject({ kind: "tx" });
    expect(classifyQuery("840000")).toEqual({ ok: true, kind: "block", value: "840000" });
  });
  it("rejects junk and testnet", () => {
    expect(classifyQuery("")).toMatchObject({ ok: false });
    expect(classifyQuery("hello")).toMatchObject({ ok: false });
    expect(classifyQuery("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx")).toMatchObject({ ok: false });
  });
});

describe("analytics", () => {
  const t1 = mkTx({ txid: "1".repeat(64), time: 1_700_000_000, ins: [[OTHER, 150_000]], outs: [[ME, 100_000], [OTHER, 49_000]] });
  const t2 = mkTx({ txid: "2".repeat(64), time: 1_702_000_000, ins: [[ME, 100_000]], outs: [[OTHER, 60_000], [ME, 39_000]], fee: 1000 });
  const t3 = mkTx({ txid: "3".repeat(64), time: 1_704_000_000, ins: [[OTHER, 90_000]], outs: [[ME, 50_000], [OTHER, 39_000]] });
  const all = [t3, t1, t2];

  it("computes per-transaction deltas", () => {
    expect(txDelta(t2, ME)).toEqual({ received: 39_000, sent: 100_000, net: -61_000 });
  });

  it("rebuilds balance history backwards from the current balance", () => {
    const current = 100_000 - 61_000 + 50_000; // 89_000
    const pts = buildBalanceHistory(all, ME, current);
    expect(pts[0].balance).toBe(0);
    expect(pts.map((p) => Math.round(p.balance * 1e8))).toEqual([0, 100_000, 39_000, 89_000]);
  });

  it("works from a partial history", () => {
    const pts = buildBalanceHistory([t3], ME, 89_000);
    expect(Math.round(pts[0].balance * 1e8)).toBe(39_000);
  });

  it("groups monthly flow using net direction", () => {
    const rows = monthlyFlow(all, ME);
    expect(rows.reduce((n, r) => n + r.txCount, 0)).toBe(3);
    expect(rows.reduce((n, r) => n + r.received, 0)).toBeCloseTo(0.0015, 8);
    expect(rows.reduce((n, r) => n + r.sent, 0)).toBeCloseTo(0.00061, 8);
  });

  it("summarises activity", () => {
    const s = summarize(all, ME);
    expect(s).toMatchObject({ incomingCount: 2, outgoingCount: 1, largestIncoming: 100_000, largestOutgoing: 61_000, feesPaid: 1000 });
    expect(s.firstSeen).toBe(1_700_000_000);
    expect(s.lastActivity).toBe(1_704_000_000);
  });

  it("ranks counterparties", () => {
    expect(topCounterparties(all, ME)[0]).toMatchObject({ address: OTHER, txCount: 3 });
  });

  it("includes mempool activity in the balance", () => {
    const z = { funded_txo_count: 0, funded_txo_sum: 0, spent_txo_count: 0, spent_txo_sum: 0, tx_count: 0 };
    expect(currentBalanceSats({ address: ME, chain_stats: { ...z, funded_txo_sum: 500, spent_txo_sum: 100 }, mempool_stats: { ...z, funded_txo_sum: 50 } })).toBe(450);
  });
});

describe("format + proxy + csv", () => {
  it("formats values", () => {
    expect(formatBtc(150_000_000)).toBe("1.50000000 BTC");
    expect(formatBtc(-1, { signed: true, unit: false })).toBe("-0.00000001");
    expect(formatUsd(1234.5)).toBe("$1,235");
    expect(shortHash("a".repeat(64), 4, 4)).toBe("aaaa…aaaa");
    expect(feeRate(1000, 800)).toBe(5);
  });
  it("only allow-lists the endpoints the app uses", () => {
    expect(isAllowedPath("address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(true);
    expect(isAllowedPath(`tx/${ID}`)).toBe(true);
    expect(isAllowedPath("v1/prices")).toBe(true);
    expect(isAllowedPath("../etc/passwd")).toBe(false);
    expect(isAllowedPath("tx/abc")).toBe(false);
    expect(isAllowedPath("v1/mining/pools")).toBe(false);
    expect(isAllowedPath("tx")).toBe(false);
  });
  it("exports csv", () => {
    const csv = transactionsToCsv([mkTx({ time: 1_700_000_000, ins: [[OTHER, 2000]], outs: [[ME, 1000]] })], ME).split("\n");
    expect(csv).toHaveLength(2);
    expect(csv[1]).toContain("0.00001000");
  });
});

import { activityByHour, activityByWeekday, addressType, summarizeUtxos, txValueSeries } from "../analytics";
import { blockSubsidySats, circulatingSupplySats, feePriority, nextHalving, priceStats } from "../market";
import { analyzeCoinbase } from "../coinbase";

describe("more analytics", () => {
  it("classifies address types", () => {
    expect(addressType("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toMatch(/P2PKH/);
    expect(addressType("3ErVzy6qnj62xxxxxxxxxxxxxxxxxxxxxx")).toMatch(/P2SH/);
    expect(addressType("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toMatch(/P2WPKH/);
    expect(addressType("bc1p" + "x".repeat(58))).toMatch(/Taproot/);
  });
  it("builds value series and activity buckets", () => {
    const t = mkTx({ time: Date.UTC(2026, 9, 27, 15, 0) / 1000, ins: [[OTHER, 2000]], outs: [[ME, 1000]] });
    expect(txValueSeries([t], ME)[0].value).toBeCloseTo(0.00001, 8);
    expect(activityByHour([t])[15].count).toBe(1);
    expect(activityByWeekday([t])[2].count).toBe(1); // Tuesday
  });
  it("summarises utxos", () => {
    const u = (value: number, t: number) => ({ txid: ID, vout: 0, value, status: { confirmed: true, block_time: t } });
    expect(summarizeUtxos([u(500, 10), u(5000, 5)])).toMatchObject({ count: 2, total: 5500, largest: 5000, smallest: 500, dustCount: 1, oldest: 5 });
    expect(summarizeUtxos([]).count).toBe(0);
  });
});

describe("market maths", () => {
  it("computes subsidy and supply", () => {
    expect(blockSubsidySats(0)).toBe(5_000_000_000);
    expect(blockSubsidySats(840_000)).toBe(312_500_000);
    expect(blockSubsidySats(973_382)).toBe(312_500_000);
    expect(circulatingSupplySats(209_999)).toBe(210_000 * 5_000_000_000);
    expect(circulatingSupplySats(973_382) / 1e8).toBeGreaterThan(20_100_000);
    expect(circulatingSupplySats(973_382) / 1e8).toBeLessThan(20_110_000);
  });
  it("finds the next halving", () => {
    const h = nextHalving(973_382, 0);
    expect(h.targetHeight).toBe(1_050_000);
    expect(h.blocksLeft).toBe(76_618);
    expect(h.newSubsidy).toBe(156_250_000);
  });
  it("summarises price range and fee priority", () => {
    expect(priceStats([{ t: 1, price: 100 }, { t: 2, price: 120 }, { t: 3, price: 90 }])).toMatchObject({ high: 120, low: 90, change: -10 });
    const fees = { fastestFee: 10, halfHourFee: 6, hourFee: 3, economyFee: 2, minimumFee: 1 };
    expect(feePriority(12, fees)).toBe("Likely next block");
    expect(feePriority(1, fees)).toBe("May take a long time");
  });
  it("reads pool, subsidy and fees from a coinbase", () => {
    const hex = Buffer.from("\u0003abc/Foundry USA Pool/").toString("hex");
    const cb: Tx = {
      txid: ID, version: 2, locktime: 0, size: 1, weight: 4, fee: 0, status: { confirmed: true },
      vin: [{ txid: "0".repeat(64), vout: 4294967295, is_coinbase: true, sequence: 0, prevout: null, scriptsig: hex }],
      vout: [{ scriptpubkey: "", scriptpubkey_type: "v1_p2tr", value: 312_500_000 + 1_234_567 }],
    };
    expect(analyzeCoinbase(cb, 973_382)).toMatchObject({ pool: "Foundry USA", subsidy: 312_500_000, fees: 1_234_567 });
    expect(analyzeCoinbase({ ...cb, vin: [{ ...cb.vin[0], is_coinbase: false }] }, 1)).toBeNull();
  });
});
