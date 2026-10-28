import { SATS_PER_BTC } from "./constants";
import type { PricePoint, RecommendedFees } from "./types";

export const HALVING_INTERVAL = 210_000;
export const MAX_SUPPLY_SATS = 21_000_000 * SATS_PER_BTC;
const INITIAL_SUBSIDY = 50 * SATS_PER_BTC;

export function blockSubsidySats(height: number): number {
  const halvings = Math.floor(height / HALVING_INTERVAL);
  return halvings >= 64 ? 0 : Math.floor(INITIAL_SUBSIDY / 2 ** halvings);
}

/** Coins issued up to and including `height` (includes unspendable/lost coins). */
export function circulatingSupplySats(height: number): number {
  let remaining = height + 1;
  let subsidy = INITIAL_SUBSIDY;
  let total = 0;
  while (remaining > 0 && subsidy > 0) {
    const n = Math.min(remaining, HALVING_INTERVAL);
    total += n * subsidy;
    remaining -= n;
    subsidy = Math.floor(subsidy / 2);
  }
  return total;
}

export function nextHalving(height: number, nowSec: number = Math.floor(Date.now() / 1000)) {
  const targetHeight = (Math.floor(height / HALVING_INTERVAL) + 1) * HALVING_INTERVAL;
  const blocksLeft = targetHeight - height;
  return {
    targetHeight,
    blocksLeft,
    etaSec: nowSec + blocksLeft * 600,
    newSubsidy: blockSubsidySats(targetHeight),
    progress: 1 - blocksLeft / HALVING_INTERVAL,
  };
}

export function priceStats(points: PricePoint[]) {
  if (points.length === 0) return null;
  const prices = points.map((p) => p.price);
  const first = prices[0];
  const last = prices[prices.length - 1];
  return {
    high: Math.max(...prices),
    low: Math.min(...prices),
    change: last - first,
    changePct: first ? ((last - first) / first) * 100 : 0,
  };
}

/** How quickly a fee rate is expected to confirm, relative to current recommendations. */
export function feePriority(rate: number, fees: RecommendedFees): string {
  if (rate >= fees.fastestFee) return "Likely next block";
  if (rate >= fees.halfHourFee) return "About 30 minutes";
  if (rate >= fees.hourFee) return "About an hour";
  if (rate >= fees.economyFee) return "Several hours";
  return "May take a long time";
}
