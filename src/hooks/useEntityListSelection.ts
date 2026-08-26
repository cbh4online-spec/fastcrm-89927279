import { useCallback, useMemo, useState } from "react";

/**
 * Gestão de seleção múltipla em listagens (contactos, empresas, leads).
 */
export function useEntityListSelection(pageIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));

  const togglePage = useCallback(() => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => set.has(id));
      if (allSelected) {
        pageIds.forEach((id) => set.delete(id));
      } else {
        pageIds.forEach((id) => set.add(id));
      }
      return Array.from(set);
    });
  }, [pageIds]);

  return {
    selectedIds,
    selectedSet,
    isSelected: (id: string) => selectedSet.has(id),
    toggle,
    togglePage,
    allPageSelected,
    clear,
    count: selectedIds.length,
  };
}
