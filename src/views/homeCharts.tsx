"use client";

import { PriceChart } from "@/components/Charts";
import { ErrorState, LoadingBlock, Tabs } from "@/components/Ui";
import { usePriceHistory } from "@/hooks/useNetwork";
import { formatUsd } from "@/lib/format";
import { priceStats } from "@/lib/market";

const RANGES = [
  { value: 1, label: "24h" },
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 365, label: "1y" },
];

function PriceTabs({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return <Tabs value={days} options={RANGES} onChange={onChange} />;
}

function Price({ days }: { days: number }) {
  const { data, isLoading, error, refetch } = usePriceHistory(days);
  if (isLoading) return <LoadingBlock label="Loading price history" />;
  if (error || !data) return <ErrorState error={error} retry={refetch} />;
  const s = priceStats(data);
  return (
    <>
      {s && (
        <dl className="inline-facts">
          <div><dt>Change</dt><dd className={`mono ${s.change >= 0 ? "in" : "out"}`}>{s.change >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%</dd></div>
          <div><dt>High</dt><dd className="mono">{formatUsd(s.high)}</dd></div>
          <div><dt>Low</dt><dd className="mono">{formatUsd(s.low)}</dd></div>
        </dl>
      )}
      <PriceChart data={data} days={days} />
    </>
  );
}

export const Charts = { PriceTabs, Price };
