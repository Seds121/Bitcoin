# Bitcoin explorer & tracker

Paste any Bitcoin **address, transaction ID, block hash or block height** and get the balance, totals, charts, every transaction and counterparty analytics — in the spirit of blockchain.com/explorer.

Stack: Next.js 14 (App Router) · TypeScript · TanStack Query v5 · Recharts · Vitest. Data: mempool.space (chain) and CoinGecko (price history), both keyless.

## Run it

```bash
npm install
cp .env.example .env.local   # optional, defaults work
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`, `npm test`.

## What you get

| Page | Shows |
|---|---|
| `/` | Search, live price, market cap, block height and reward, fee tiers, supply issued and halving countdown, price chart with change/high/low (24h–1y), latest blocks (gap, fullness), latest unconfirmed transactions, recent searches |
| `/address/[address]` | Balance (BTC + USD), total received/sent, transaction count, unspent outputs, address type, value in USD/EUR/GBP, balance-over-time chart, monthly in/out chart, per-transaction amount chart, activity by weekday/hour, activity stats, top counterparties, unspent-output breakdown (largest, dust, oldest), filterable transaction list, CSV export, watchlist toggle |
| `/tx/[txid]` | Total output, fee (BTC, sat/vB, USD), confirmations (auto-refreshes while unconfirmed), expected confirmation time, input/output tables with script types and spent/unspent status, SegWit/Taproot/RBF flags, size/vsize/weight |
| `/block/[height or hash]` | Time, confirmations, tx count, size and fullness, difficulty, miner (read from the coinbase), reward = subsidy + fees, coinbase text, merkle root, prev/next, paginated transactions |
| `/watchlist` | Saved addresses with live balance, USD value and tx count (stored in the browser) |

## Architecture in one minute

```
Browser (React + TanStack Query hooks)
   │  fetch /api/btc/...            fetch /api/price-history
   ▼
Next.js route handlers  ── allow-list + caching ──►  mempool.space / CoinGecko
```

- `src/app` — routes (server components validate params, render a client view) and API proxy routes.
- `src/views` — one screen-level component per page.
- `src/components` — presentational pieces (charts, tx card, stat, search).
- `src/hooks` — all data fetching and state (`useAddressDashboard`, `useBlock`, `useWatchlist`, …).
- `src/lib` — pure, unit-tested logic: query classification, analytics, formatting, CSV, proxy allow-list.

See `docs/REPORT.md` for the full design report.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `MEMPOOL_API_BASE` | `https://mempool.space/api,https://blockstream.info/api` | Comma-separated chain data providers, tried in order with automatic failover. Put a self-hosted mempool first for production. |
| `COINGECKO_API_BASE` | `https://api.coingecko.com/api/v3` | Price history. |

## Notes and limits

- Mainnet only. Testnet input is rejected with a clear message.
- Address charts and analytics are computed from loaded transactions (25 per page, up to 500 via "Load up to 500"). Totals and balance always come from the full on-chain stats.
- Public APIs are rate limited; the proxy caches responses (20 s live data, 5 min for confirmed blocks/transactions). For heavy traffic, self-host mempool or add a paid key.

## Troubleshooting

Every `/api/btc/*` request returning 502 means the server can't reach any data provider. The terminal prints the reason per provider, for example `[btc proxy] ... failed -> mempool.space: UND_ERR_CONNECT_TIMEOUT | blockstream.info: timeout`, and the response body lists the same under `detail`. Check from the same machine:

```bash
curl -m 10 https://mempool.space/api/blocks/tip/height
curl -m 10 https://blockstream.info/api/blocks/tip/height
```

If both fail, your network or ISP is blocking them: use a VPN, or set `MEMPOOL_API_BASE` to a provider you can reach. If `curl` works but Node doesn't, try `NODE_OPTIONS=--dns-result-order=ipv4first npm run dev`.
