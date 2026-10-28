"use client";

import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { btcApi } from "@/lib/api";
import { MAX_HISTORY_TXS, MAX_UTXO_LIST, PAGE_SIZE } from "@/lib/constants";
import {
  activityByHour,
  activityByWeekday,
  buildBalanceHistory,
  confirmedBalanceSats,
  currentBalanceSats,
  monthlyFlow,
  summarize,
  summarizeUtxos,
  topCounterparties,
  txValueSeries,
} from "@/lib/analytics";
import type { Tx } from "@/lib/types";

export const useAddressInfo = (address: string) =>
  useQuery({
    queryKey: ["address", address],
    queryFn: () => btcApi.address(address),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

/** Pages through an address's history, 25 confirmed transactions at a time. */
export function useAddressTransactions(address: string) {
  return useInfiniteQuery({
    queryKey: ["address-txs", address],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => btcApi.addressTxs(address, pageParam),
    getNextPageParam: (lastPage: Tx[]) => {
      const confirmed = lastPage.filter((t) => t.status.confirmed);
      if (confirmed.length < PAGE_SIZE) return undefined;
      return confirmed[confirmed.length - 1].txid;
    },
    staleTime: 30_000,
  });
}

/** Lists unspent outputs. Only fetched when the count is small enough for the provider to return them. */
export function useAddressUtxos(address: string, count: number) {
  const query = useQuery({
    queryKey: ["address-utxos", address],
    queryFn: () => btcApi.addressUtxos(address),
    enabled: count > 0 && count <= MAX_UTXO_LIST,
    staleTime: 30_000,
  });
  const summary = useMemo(() => (query.data ? summarizeUtxos(query.data) : null), [query.data]);
  const largest = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.value - a.value).slice(0, 10),
    [query.data],
  );
  return { ...query, summary, largest, tooMany: count > MAX_UTXO_LIST };
}

export type TxFilter = "all" | "incoming" | "outgoing";

/**
 * Everything the address page needs, derived in one place:
 * live info, loaded transactions, analytics and history controls.
 */
export function useAddressDashboard(address: string) {
  const info = useAddressInfo(address);
  const txQuery = useAddressTransactions(address);
  const [loadingAll, setLoadingAll] = useState(false);

  const txs = useMemo<Tx[]>(() => {
    const seen = new Set<string>();
    const flat: Tx[] = [];
    for (const page of txQuery.data?.pages ?? []) {
      for (const tx of page) {
        if (!seen.has(tx.txid)) {
          seen.add(tx.txid);
          flat.push(tx);
        }
      }
    }
    return flat;
  }, [txQuery.data]);

  const balanceSats = info.data ? currentBalanceSats(info.data) : 0;
  const totalTxCount = info.data ? info.data.chain_stats.tx_count + info.data.mempool_stats.tx_count : 0;

  const analytics = useMemo(() => {
    if (!info.data) return null;
    return {
      balanceHistory: buildBalanceHistory(txs, address, balanceSats),
      monthly: monthlyFlow(txs, address),
      summary: summarize(txs, address),
      counterparties: topCounterparties(txs, address),
      valueSeries: txValueSeries(txs, address),
      weekday: activityByWeekday(txs),
      hour: activityByHour(txs),
    };
  }, [info.data, txs, address, balanceSats]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = txQuery;

  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      let count = txs.length;
      let more = hasNextPage;
      while (more && count < MAX_HISTORY_TXS) {
        const res = await fetchNextPage();
        count = res.data?.pages.reduce((n, p) => n + p.length, 0) ?? count;
        more = Boolean(res.hasNextPage);
      }
    } finally {
      setLoadingAll(false);
    }
  }, [txs.length, hasNextPage, fetchNextPage]);

  return {
    info,
    txQuery,
    txs,
    analytics,
    balanceSats,
    confirmedSats: info.data ? confirmedBalanceSats(info.data) : 0,
    totalTxCount,
    hasMore: Boolean(hasNextPage) && txs.length < MAX_HISTORY_TXS,
    isFetchingMore: isFetchingNextPage || loadingAll,
    loadMore: () => fetchNextPage(),
    loadAll,
    historyComplete: !hasNextPage && !txQuery.isLoading,
  };
}
