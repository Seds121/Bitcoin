"use client";

import { useQuery } from "@tanstack/react-query";
import { btcApi } from "@/lib/api";

export const useBtcPrice = () =>
  useQuery({ queryKey: ["prices"], queryFn: btcApi.prices, refetchInterval: 60_000, staleTime: 30_000 });

export const useTipHeight = () =>
  useQuery({ queryKey: ["tip-height"], queryFn: btcApi.tipHeight, refetchInterval: 60_000, staleTime: 30_000 });

export const useRecommendedFees = () =>
  useQuery({ queryKey: ["fees"], queryFn: btcApi.fees, refetchInterval: 60_000, staleTime: 30_000 });

export const useMempool = () =>
  useQuery({ queryKey: ["mempool"], queryFn: btcApi.mempool, refetchInterval: 60_000, staleTime: 30_000 });

export const useLatestBlocks = () =>
  useQuery({ queryKey: ["latest-blocks"], queryFn: btcApi.latestBlocks, refetchInterval: 60_000, staleTime: 30_000 });

export const usePriceHistory = (days: number) =>
  useQuery({ queryKey: ["price-history", days], queryFn: () => btcApi.priceHistory(days), staleTime: 300_000, retry: 1 });

export const useRecentMempool = () =>
  useQuery({ queryKey: ["mempool-recent"], queryFn: btcApi.mempoolRecent, refetchInterval: 30_000, staleTime: 15_000 });
