/**
 * Server-side upstream client with provider fallback.
 *
 * MEMPOOL_API_BASE accepts a comma-separated list of Esplora-compatible bases
 * (mempool.space and blockstream.info share the same address/tx/block API).
 * Providers that just failed are skipped for a short cool-down so a blocked
 * provider doesn't add its timeout to every request.
 */
const DEFAULT_BASES = "https://mempool.space/api,https://blockstream.info/api";
const COINGECKO = process.env.COINGECKO_API_BASE ?? "https://api.coingecko.com/api/v3";

export const BASES = (process.env.MEMPOOL_API_BASE ?? DEFAULT_BASES)
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

const TIMEOUT_MS = 8000;
const COOLDOWN_MS = 60_000;
const failedAt = new Map<string, number>();

export interface UpstreamResult {
  status: number;
  body: string;
  contentType: string;
  source: string;
}

const reason = (err: unknown): string => {
  const e = err as { name?: string; cause?: { code?: string; message?: string }; message?: string };
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return "timeout";
  return e?.cause?.code ?? e?.cause?.message ?? e?.message ?? "unknown error";
};

async function tryBase(base: string, path: string, revalidate: number): Promise<UpstreamResult> {
  const res = await fetch(`${base}/${path}`, {
    headers: { Accept: "application/json, text/plain" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate },
  });
  return { status: res.status, body: await res.text(), contentType: res.headers.get("content-type") ?? "text/plain", source: base };
}

const json = (data: unknown, source: string): UpstreamResult => ({
  status: 200,
  body: JSON.stringify(data),
  contentType: "application/json",
  source,
});

/** Fallbacks for mempool.space-only (/v1/*) endpoints, built from other sources. */
async function fallbackFor(path: string, revalidate: number): Promise<UpstreamResult | null> {
  const esplora = BASES.find((b) => b.includes("blockstream")) ?? BASES[BASES.length - 1];

  if (path === "v1/prices") {
    const res = await fetch(`${COINGECKO}/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { bitcoin: { usd: number; eur: number; gbp: number } };
    return json({ time: Math.floor(Date.now() / 1000), USD: d.bitcoin.usd, EUR: d.bitcoin.eur, GBP: d.bitcoin.gbp }, "coingecko");
  }

  if (path === "v1/fees/recommended" && esplora) {
    const r = await tryBase(esplora, "fee-estimates", revalidate);
    if (r.status !== 200) return null;
    const est = JSON.parse(r.body) as Record<string, number>;
    const at = (k: string, fb: number) => Math.max(1, Math.ceil(est[k] ?? fb));
    return json(
      { fastestFee: at("1", 2), halfHourFee: at("3", 2), hourFee: at("6", 1), economyFee: at("144", 1), minimumFee: 1 },
      esplora,
    );
  }

  if (path === "v1/blocks" && esplora) {
    const r = await tryBase(esplora, "blocks", revalidate);
    return r.status === 200 ? r : null;
  }

  return null;
}

export async function fetchUpstream(path: string, revalidate: number): Promise<UpstreamResult> {
  // mempool.space-only endpoints are asked of the first provider only.
  const candidates = path.startsWith("v1/") ? BASES.slice(0, 1) : BASES;
  const now = Date.now();
  const healthy = candidates.filter((b) => now - (failedAt.get(b) ?? 0) > COOLDOWN_MS);
  const order = healthy.length ? healthy : candidates;
  const errors: string[] = [];

  for (const base of order) {
    try {
      const r = await tryBase(base, path, revalidate);
      // 2xx and genuine 4xx (not found, bad input) are final answers.
      if (r.status < 500 && r.status !== 429) {
        failedAt.delete(base);
        return r;
      }
      errors.push(`${new URL(base).host}: HTTP ${r.status}`);
    } catch (err) {
      errors.push(`${new URL(base).host}: ${reason(err)}`);
    }
    failedAt.set(base, Date.now());
  }

  try {
    const fb = await fallbackFor(path, revalidate);
    if (fb) return fb;
  } catch (err) {
    errors.push(`fallback: ${reason(err)}`);
  }

  console.error(`[btc proxy] ${path} failed -> ${errors.join(" | ")}`);
  return {
    status: 502,
    body: JSON.stringify({ error: "Could not reach any Bitcoin data provider.", detail: errors }),
    contentType: "application/json",
    source: "none",
  };
}
