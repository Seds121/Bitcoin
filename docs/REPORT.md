# Bitcoin Tracking Platform — Build Report

## 1. Goal

A Next.js platform where a user enters a Bitcoin result (address, transaction, block) and sees as much detail as possible — balance, totals, transaction count, charts — similar to https://www.blockchain.com/explorer.

## 2. Scope delivered

**In scope (implemented):** Bitcoin mainnet; universal search; address, transaction, block pages; home dashboard; watchlist; CSV export; charts; caching proxy; tests.
**Out of scope (see roadmap):** other chains, user accounts, server-side persistence, alerts, wallet clustering/labels.

### 2.1 Derived data (no extra API needed)

Some details are computed rather than fetched, so they work with any provider:
miner (matched from the coinbase text, best effort), block reward and fees (coinbase output minus the subsidy for that height), coin supply and halving countdown (from block height), market cap (supply × price), address type (from the prefix), activity by weekday/hour, per-transaction amounts, UTXO statistics, and expected confirmation time (fee rate vs. current recommendations).

## 3. Data source decision

| Option | Verdict |
|---|---|
| mempool.space REST API | **Chosen.** Free, no key, address/tx/block/fee/price endpoints, open source so it can be self-hosted. |
| blockchain.info / blockchain.com API | Rate limits and key requirements are tighter; endpoints changed over time. |
| Run own Bitcoin Core node | Best control, but heavy infra (600 GB+) and needs an indexer for address lookups. Future option via self-hosted mempool/electrs. |
| CoinGecko (price history) | **Chosen** for historical price chart; keyless public tier. |

All upstream calls go through our own server routes so that: CORS is a non-issue, responses are cached, the upstream can be swapped by env var, and only an allow-list of read-only endpoints is reachable.

## 4. Architecture

```
React views ──► hooks (TanStack Query) ──► lib/api.ts ──► /api/btc/* (route handler)
                     │                                          │ allow-list, revalidate
                     ▼                                          ▼
              lib/analytics.ts (pure)                    mempool.space
                                      /api/price-history ─► CoinGecko
```

Principles (matching the team's conventions): hooks-first (views contain no fetching logic), one design-token file (`globals.css`), strict TypeScript, pure logic isolated in `lib/` and unit tested.

### Folder map

```
src/app          routes, layout, providers, API proxy routes
src/views        HomeView, AddressView, TxView, BlockView, WatchlistView
src/components   Charts, TxCard, TxList, SearchBar, Ui (Panel, Stat, Tabs…), buttons
src/hooks        useAddress, useBlock, useTransaction, useNetwork, useSearch, useStoredLists, useCopy
src/lib          api, analytics, search, format, csv, proxy, localStore, types, constants
```

## 5. Key design decisions

1. **Universal search (`lib/search.ts`).** Classifies input: digits → block height; 64-hex with ≥8 leading zeros → block hash, otherwise txid; legacy `1…/3…` and bech32 `bc1…` → address (bech32 normalised to lower case; `bitcoin:` URIs unwrapped); testnet rejected with an explanation.
2. **Balance history without an indexer.** The explorer API gives current balance plus a transaction list, not a time series. We rebuild history by walking backwards from the known current balance, subtracting each transaction's net effect on the address. This is exact even when only the latest N transactions are loaded.
3. **Net-direction monthly flow.** A send with change returns coins to the same address; counting raw outputs would inflate both bars. Each transaction contributes only its net effect.
4. **Pagination.** Address history uses cursor pagination (`/txs/chain/:last_txid`, 25 per page) with TanStack `useInfiniteQuery`; "Load up to 500" loops pages with a hard cap to protect the upstream.
5. **Totals vs. analytics honesty.** Headline numbers (balance, received, sent, tx count, UTXOs) come from full on-chain stats. Charts and activity stats come from loaded transactions and say so on screen.
6. **Live-ness.** Prices, tip height, fees, mempool and address info poll every 60 s; an unconfirmed transaction polls every 30 s and stops once confirmed.
7. **Watchlist in `localStorage`** through `useSyncExternalStore` (SSR-safe, cross-tab sync, stable snapshots). No account system needed for v1.
8. **Error handling.** `ApiError` carries the HTTP status; 4xx is never retried; messages are plain-language (not found, rate limited, provider down).
9. **Security.** Proxy allow-list with strict regexes (no path traversal, no arbitrary hosts), params validated server-side before rendering, no secrets in the client, `poweredByHeader` off.

## 6. Feature → endpoint map

| Feature | Upstream endpoint |
|---|---|
| Address stats | `GET /address/:addr` |
| Address txs | `GET /address/:addr/txs`, `/txs/chain/:last_txid` |
| Transaction | `GET /tx/:txid` |
| Block / by height | `GET /block/:hash`, `/block-height/:h`, `/block/:hash/txs/:start` |
| Network | `/blocks/tip/height`, `/mempool`, `/v1/fees/recommended`, `/v1/blocks`, `/v1/prices` |
| Price chart | CoinGecko `/coins/bitcoin/market_chart` |

## 7. Quality

- `npm run typecheck` — strict TS, clean.
- `npm test` — 14 unit tests: query classification, delta/balance-history maths, monthly flow, summaries, counterparties, mempool balance, formatting, proxy allow-list, CSV.
- `npm run build` — production build passes.
- Verified against a mock upstream: proxy returns JSON and plain-text endpoints, passes upstream 404s through, rejects non-allow-listed paths (400); pages return 200 for valid input and 404 for malformed addresses/hashes.
- **Not verified in the build environment:** live calls to mempool.space/CoinGecko (sandbox has no access to those hosts) and visual rendering in a browser. Do a first run with `npm run dev` and try the sample address.

## 8. Known limits

- Public API rate limits and regional blocking. Mitigation: caching, automatic failover from mempool.space to blockstream.info (price and fee fallbacks included), self-host mempool for production.
- Very large addresses (exchanges, 100k+ txs): totals are exact, charts cover the latest 25–500 transactions.
- Watchlist is per-browser.
- CoinGecko's free tier can rate-limit the price chart; the rest of the app still works.

## 9. Roadmap

| Phase | Items |
|---|---|
| 1 (next) | Self-hosted mempool/electrs; Redis or edge cache; price at time of each transaction (historical USD value / P&L) |
| 2 | Accounts (Supabase) with synced watchlists, address labels, notes; email/webhook alerts on new activity |
| 3 | Multi-chain via a `ChainProvider` interface (Ethereum, Litecoin, …) — `lib/api.ts` and `lib/analytics.ts` are already the only chain-specific modules |
| 4 | Cluster/entity labels, UTXO treemap, Sankey flow graph, PDF report export |

## 10. Deploy

Works on Vercel as-is (`npm run build`). Set `MEMPOOL_API_BASE` if self-hosting. No database required.
