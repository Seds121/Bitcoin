"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createListStore } from "@/lib/localStore";
import type { SearchKind } from "@/lib/types";

export interface WatchedAddress {
  address: string;
  label?: string;
  addedAt: number;
}

export interface RecentSearch {
  value: string;
  kind: SearchKind;
  at: number;
}

const watchStore = createListStore<WatchedAddress>("btc-tracker:watchlist", 100);
const recentStore = createListStore<RecentSearch>("btc-tracker:recent", 8);

export function useWatchlist() {
  const items = useSyncExternalStore(watchStore.subscribe, watchStore.getSnapshot, watchStore.getServerSnapshot);

  const has = useCallback((address: string) => items.some((i) => i.address === address), [items]);
  const add = useCallback(
    (address: string, label?: string) => {
      if (watchStore.getSnapshot().some((i) => i.address === address)) return;
      watchStore.set([{ address, label: label?.trim() || undefined, addedAt: Date.now() }, ...watchStore.getSnapshot()]);
    },
    [],
  );
  const remove = useCallback(
    (address: string) => watchStore.set(watchStore.getSnapshot().filter((i) => i.address !== address)),
    [],
  );
  const toggle = useCallback(
    (address: string) => (watchStore.getSnapshot().some((i) => i.address === address) ? remove(address) : add(address)),
    [add, remove],
  );

  return { items, has, add, remove, toggle };
}

export function useRecentSearches() {
  const items = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, recentStore.getServerSnapshot);

  const push = useCallback((value: string, kind: SearchKind) => {
    const rest = recentStore.getSnapshot().filter((r) => r.value !== value);
    recentStore.set([{ value, kind, at: Date.now() }, ...rest]);
  }, []);
  const clear = useCallback(() => recentStore.set([]), []);

  return { items, push, clear };
}
