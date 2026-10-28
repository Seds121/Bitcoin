import Link from "next/link";
import { SearchBar } from "./SearchBar";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-row">
        <Link href="/" className="nav-link">
          Home
        </Link>
        <div className="header-search">
          <SearchBar size="sm" />
        </div>
        <nav aria-label="Primary">
          <Link href="/watchlist" className="nav-link">
            Watchlist
          </Link>
        </nav>
      </div>
    </header>
  );
}
