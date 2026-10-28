"use client";

import { useSearch } from "@/hooks/useSearch";

export function SearchBar({ size = "lg", autoFocus = false }: { size?: "lg" | "sm"; autoFocus?: boolean }) {
  const { value, error, submit, onChange } = useSearch();
  return (
    <form className={`search search-${size}`} onSubmit={submit} role="search">
      <div className="search-row">
        <input
          className="input"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Address, transaction ID, block hash or block height"
          aria-label="Search the Bitcoin blockchain"
          aria-invalid={Boolean(error)}
          autoFocus={autoFocus}
          spellCheck={false}
          autoComplete="off"
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
