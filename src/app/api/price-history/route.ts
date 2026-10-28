import { NextResponse } from "next/server";
import type { PricePoint } from "@/lib/types";

const BASE = process.env.COINGECKO_API_BASE ?? "https://api.coingecko.com/api/v3";
const ALLOWED_DAYS = new Set([1, 7, 30, 90, 365]);

export async function GET(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days") ?? "30");
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: "days must be one of 1, 7, 30, 90, 365." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Price provider returned an error." }, { status: upstream.status === 429 ? 429 : 502 });
    }
    const data = (await upstream.json()) as { prices: [number, number][] };
    const points: PricePoint[] = data.prices.map(([ms, price]) => ({ t: Math.floor(ms / 1000), price }));
    return NextResponse.json(points, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Could not reach the price provider." }, { status: 502 });
  }
}
