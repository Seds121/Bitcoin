"use client";

import { useQuery } from "@tanstack/react-query";
import { btcApi } from "@/lib/api";

export const useTransaction = (txid: string) =>
  useQuery({
    queryKey: ["tx", txid],
    queryFn: () => btcApi.tx(txid),
    // Poll while unconfirmed so the status flips automatically.
    refetchInterval: (query) => (query.state.data?.status.confirmed ? false : 30_000),
    staleTime: 30_000,
  });

export const useOutspends = (txid: string) =>
  useQuery({ queryKey: ["outspends", txid], queryFn: () => btcApi.outspends(txid), staleTime: 30_000 });
