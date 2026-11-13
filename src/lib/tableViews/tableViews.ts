export interface TableViewState {
  visibleColumns: string[];
  columnOrder: string[];
  filters: Record<string, unknown>;
  activeFilterId?: string;
  sortValue?: string;
  searchValue?: string;
}

export interface SavedTableView extends TableViewState {
  id: string;
  name: string;
  createdAt: string;
}

/** Remove paginação e valores vazios antes de guardar filtros. */
export function cleanFilters(filters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters || {})) {
    if (k === "page") continue;
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function parseViews(raw: string | null): SavedTableView[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => v && typeof v.id === "string" && typeof v.name === "string") : [];
  } catch {
    return [];
  }
}

/** Guarda uma vista; o mesmo nome (sem distinguir maiúsculas) substitui a anterior. */
export function upsertView(views: SavedTableView[], view: SavedTableView): SavedTableView[] {
  const key = view.name.trim().toLowerCase();
  return [...views.filter((v) => v.name.trim().toLowerCase() !== key), view];
}
