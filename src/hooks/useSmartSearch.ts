import { useMemo, useState, useCallback } from "react";
import Fuse from "fuse.js";
import { matchSorter } from "match-sorter";
import { useDebouncedCallback } from "use-debounce";

interface UseSmartSearchOptions<T> {
  /** Items to search through */
  items: T[];
  /** Keys to search on (dot-notation supported) */
  keys: string[];
  /** Debounce delay in ms (default 200) */
  debounce?: number;
  /** Max results (default 50) */
  limit?: number;
  /** Fuse.js threshold (0 = exact, 1 = anything; default 0.4) */
  threshold?: number;
}

/**
 * Combines Fuse.js fuzzy search with match-sorter ranking.
 * Debounces the query for performance on large datasets.
 *
 * Usage:
 * ```
 * const { query, setQuery, results } = useSmartSearch({
 *   items: contacts,
 *   keys: ["name", "email", "company.name"],
 * });
 * ```
 */
export function useSmartSearch<T>({
  items,
  keys,
  debounce = 200,
  limit = 50,
  threshold = 0.4,
}: UseSmartSearchOptions<T>) {
  const [query, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const debouncedSet = useDebouncedCallback((val: string) => {
    setDebouncedQuery(val);
  }, debounce);

  const setQuery = useCallback(
    (val: string) => {
      setQueryState(val);
      debouncedSet(val);
    },
    [debouncedSet],
  );

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys,
        threshold,
        includeScore: true,
        shouldSort: true,
      }),
    [items, keys, threshold],
  );

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return items.slice(0, limit);

    // Fuse fuzzy results
    const fuseResults = fuse.search(debouncedQuery, { limit: limit * 2 });
    const fuseItems = fuseResults.map((r) => r.item);

    // match-sorter for ranking refinement
    const ranked = matchSorter(fuseItems, debouncedQuery, {
      keys: keys as any[],
    });

    return ranked.slice(0, limit);
  }, [items, debouncedQuery, fuse, keys, limit]);

  return { query, setQuery, results, isSearching: !!debouncedQuery.trim() };
}
