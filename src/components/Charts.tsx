"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors as c } from "@/lib/theme";
import { formatUsd } from "@/lib/format";
import type { ActivityBucket, BalancePoint, MonthlyFlow, PricePoint, TxValuePoint } from "@/lib/types";

const axisProps = { stroke: c.muted, fontSize: 12, tickLine: false, axisLine: { stroke: c.grid } } as const;

const dateTick = (t: number, withYear: boolean) =>
  new Date(t * 1000).toLocaleDateString("en-GB", withYear ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "short" });

export function BalanceChart({ data }: { data: BalancePoint[] }) {
  const spanDays = data.length ? (data[data.length - 1].t - data[0].t) / 86400 : 0;
  return (
    <div className="chart" role="img" aria-label="Balance over time in BTC">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.blue} stopOpacity={0.25} />
              <stop offset="100%" stopColor={c.blue} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={(t) => dateTick(t, spanDays > 120)} {...axisProps} />
          <YAxis width={64} tickFormatter={(v) => Number(v).toFixed(v < 1 ? 3 : 1)} {...axisProps} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(8)} BTC`, "Balance"]}
            labelFormatter={(t: number) => new Date(t * 1000).toLocaleString("en-GB")}
          />
          <Area type="stepAfter" dataKey="balance" stroke={c.blue} strokeWidth={2} fill="url(#balFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FlowChart({ data }: { data: MonthlyFlow[] }) {
  return (
    <div className="chart" role="img" aria-label="Monthly received and sent in BTC">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis width={64} tickFormatter={(v) => Number(v).toFixed(v < 1 ? 3 : 1)} {...axisProps} />
          <Tooltip formatter={(v: number, name: string) => [`${v.toFixed(8)} BTC`, name]} />
          <Legend />
          <Bar dataKey="received" name="Received" fill={c.incoming} radius={[3, 3, 0, 0]} />
          <Bar dataKey="sent" name="Sent" fill={c.outgoing} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceChart({ data, days }: { data: PricePoint[]; days: number }) {
  return (
    <div className="chart" role="img" aria-label="Bitcoin price in USD">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) =>
              days <= 1
                ? new Date(t * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                : dateTick(t, days > 120)
            }
            {...axisProps}
          />
          <YAxis width={72} domain={["auto", "auto"]} tickFormatter={(v) => formatUsd(Number(v), true)} {...axisProps} />
          <Tooltip
            formatter={(v: number) => [formatUsd(v), "BTC price"]}
            labelFormatter={(t: number) => new Date(t * 1000).toLocaleString("en-GB")}
          />
          <Area type="monotone" dataKey="price" stroke={c.accent} strokeWidth={2} fill="url(#priceFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TxValueChart({ data }: { data: TxValuePoint[] }) {
  return (
    <div className="chart" role="img" aria-label="Net amount of each transaction in BTC">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t) => dateTick(t, false)} {...axisProps} />
          <YAxis width={72} tickFormatter={(v) => Number(v).toPrecision(2)} {...axisProps} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(8)} BTC`, v >= 0 ? "Received" : "Sent"]}
            labelFormatter={(t: number) => new Date(t * 1000).toLocaleString("en-GB")}
          />
          <Bar dataKey="value" name="Net amount" maxBarSize={14}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? c.incoming : c.outgoing} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart({ data, unit }: { data: ActivityBucket[]; unit: string }) {
  return (
    <div className="chart" role="img" aria-label={`Transactions per ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis dataKey="label" interval={unit === "hour" ? 2 : 0} {...axisProps} />
          <YAxis width={36} allowDecimals={false} {...axisProps} />
          <Tooltip formatter={(v: number) => [v, "Transactions"]} labelFormatter={(l) => (unit === "hour" ? `${l}:00 UTC` : `${l} (UTC)`)} />
          <Bar dataKey="count" name="Transactions" fill={c.blue} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
