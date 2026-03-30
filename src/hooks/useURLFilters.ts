import { useQueryStates, parseAsString, parseAsInteger, parseAsArrayOf } from "nuqs";

/**
 * Sync table/list filters with URL query parameters.
 *
 * Usage:
 * ```
 * const { filters, setFilter, resetFilters } = useURLFilters({
 *   search: "",
 *   status: "",
 *   page: 1,
 * });
 * ```
 */
export function useURLFilters<
  T extends Record<string, string | number | string[]>,
>(defaults: T) {
  // Build parsers from defaults
  const parsers: Record<string, any> = {};
  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (typeof defaultVal === "number") {
      parsers[key] = parseAsInteger.withDefault(defaultVal);
    } else if (Array.isArray(defaultVal)) {
      parsers[key] = parseAsArrayOf(parseAsString).withDefault(defaultVal);
    } else {
      parsers[key] = parseAsString.withDefault(defaultVal as string);
    }
  }

  const [filters, setFilters] = useQueryStates(parsers, {
    history: "replace",
  });

  const setFilter = <K extends keyof T>(key: K, value: T[K]) => {
    setFilters({ [key]: value } as any);
  };

  const resetFilters = () => {
    setFilters(defaults as any);
  };

  return {
    filters: filters as unknown as T,
    setFilter,
    setFilters,
    resetFilters,
  };
}
