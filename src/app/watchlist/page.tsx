import type { Metadata } from "next";
import { WatchlistView } from "@/views/WatchlistView";

export const metadata: Metadata = { title: "Watchlist" };

export default function WatchlistPage() {
  return <WatchlistView />;
}
