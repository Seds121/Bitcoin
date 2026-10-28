/**
 * Tiny external store over localStorage, shaped for useSyncExternalStore.
 * Snapshots are cached by raw string so React gets a stable reference.
 */
export function createListStore<T>(key: string, max = 100) {
  const EMPTY: T[] = [];
  let cachedRaw: string | null = null;
  let cached: T[] = EMPTY;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());

  const getSnapshot = (): T[] => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === cachedRaw) return cached;
      cachedRaw = raw;
      cached = raw ? (JSON.parse(raw) as T[]) : EMPTY;
    } catch {
      cached = EMPTY;
    }
    return cached;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  const set = (items: T[]) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(items.slice(0, max)));
    } catch {
      /* storage full or unavailable: ignore */
    }
    emit();
  };

  return { subscribe, getSnapshot, getServerSnapshot: (): T[] => EMPTY, set };
}
