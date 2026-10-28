"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { classifyQuery } from "@/lib/search";
import { addressHref, blockHref, txHref } from "@/lib/routes";
import { useRecentSearches } from "./useStoredLists";

export function useSearch() {
  const router = useRouter();
  const recent = useRecentSearches();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = (query: string) => {
    const result = classifyQuery(query);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setError(null);
    recent.push(result.value, result.kind);
    setValue("");
    router.push(
      result.kind === "address" ? addressHref(result.value) : result.kind === "tx" ? txHref(result.value) : blockHref(result.value),
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(value);
  };

  return {
    value,
    error,
    submit,
    go,
    onChange: (next: string) => {
      setValue(next);
      if (error) setError(null);
    },
  };
}
