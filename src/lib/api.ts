import type {
  AddressInfo,
  Block,
  BlockSummary,
  MempoolInfo,
  MempoolRecentTx,
  Outspend,
  PricePoint,
  Prices,
  RecommendedFees,
  Tx,
  Utxo,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function friendly(status: number, body: string): string {
  let message = body;
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) message = parsed.error;
  } catch {
    /* body was plain text */
  }
  if (status === 404) return "Nothing found for that lookup.";
  if (status === 429) return "The data provider is rate-limiting requests. Try again in a minute.";
  if (status >= 500) return "The data provider is unavailable right now. Try again shortly.";
  return message || `Request failed (${status}).`;
}

async function request(url: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError("Network error. Check your connection and try again.", 0);
  }
  if (!res.ok) throw new ApiError(friendly(res.status, await res.text().catch(() => "")), res.status);
  return res;
}

const getJson = async <T>(path: string): Promise<T> => (await request(`/api/btc/${path}`)).json() as Promise<T>;
const getText = async (path: string): Promise<string> => (await request(`/api/btc/${path}`)).text();

export const btcApi = {
  address: (address: string) => getJson<AddressInfo>(`address/${address}`),
  /** First page includes unconfirmed txs. Pass the last confirmed txid for the next page. */
  addressTxs: (address: string, lastSeenTxid?: string) =>
    getJson<Tx[]>(lastSeenTxid ? `address/${address}/txs/chain/${lastSeenTxid}` : `address/${address}/txs`),
  addressUtxos: (address: string) => getJson<Utxo[]>(`address/${address}/utxo`),
  tx: (txid: string) => getJson<Tx>(`tx/${txid}`),
  outspends: (txid: string) => getJson<Outspend[]>(`tx/${txid}/outspends`),
  block: (hash: string) => getJson<Block>(`block/${hash}`),
  blockHash: (height: string) => getText(`block-height/${height}`),
  blockTxs: (hash: string, startIndex = 0) => getJson<Tx[]>(`block/${hash}/txs/${startIndex}`),
  tipHeight: async () => Number(await getText("blocks/tip/height")),
  prices: () => getJson<Prices>("v1/prices"),
  fees: () => getJson<RecommendedFees>("v1/fees/recommended"),
  mempool: () => getJson<MempoolInfo>("mempool"),
  mempoolRecent: () => getJson<MempoolRecentTx[]>("mempool/recent"),
  latestBlocks: () => getJson<BlockSummary[]>("v1/blocks"),
  priceHistory: async (days: number) =>
    (await (await request(`/api/price-history?days=${days}`)).json()) as PricePoint[],
};
