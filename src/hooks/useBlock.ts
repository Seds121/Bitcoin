"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { btcApi } from "@/lib/api";
import { PAGE_SIZE } from "@/lib/constants";
import type { Tx } from "@/lib/types";

/** Accepts either a block height or a block hash. */
export function useBlock(idOrHeight: string) {
  const isHeight = /^\d+$/.test(idOrHeight);

  const hashQuery = useQuery({
    queryKey: ["block-hash", idOrHeight],
    queryFn: () => btcApi.blockHash(idOrHeight),
    enabled: isHeight,
    staleTime: 300_000,
  });

  const hash = isHeight ? hashQuery.data : idOrHeight;

  const blockQuery = useQuery({
    queryKey: ["block", hash],
    queryFn: () => btcApi.block(hash as string),
    enabled: Boolean(hash),
    staleTime: 300_000,
  });

  return {
    block: blockQuery.data,
    isLoading: hashQuery.isLoading || blockQuery.isLoading,
    error: hashQuery.error ?? blockQuery.error,
  };
}

export const useBlockTransactions = (hash: string | undefined, txCount: number | undefined) =>
  useInfiniteQuery({
    queryKey: ["block-txs", hash],
    enabled: Boolean(hash),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => btcApi.blockTxs(hash as string, pageParam),
    getNextPageParam: (lastPage: Tx[], pages) => {
      const loaded = pages.length * PAGE_SIZE;
      return lastPage.length === PAGE_SIZE && loaded < (txCount ?? 0) ? loaded : undefined;
    },
    staleTime: 300_000,
  });
