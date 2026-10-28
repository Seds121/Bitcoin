"use client";

import { useWatchlist } from "@/hooks/useStoredLists";

export function WatchlistButton({ address }: { address: string }) {
  const { has, toggle } = useWatchlist();
  const watching = has(address);
  return (
    <button className={watching ? "btn btn-sm" : "btn btn-sm btn-primary"} onClick={() => toggle(address)} aria-pressed={watching}>
      {watching ? "Remove from watchlist" : "Add to watchlist"}
    </button>
  );
}
