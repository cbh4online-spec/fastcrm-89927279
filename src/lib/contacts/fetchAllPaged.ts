/** Lê todas as linhas em blocos (a API devolve no máximo 1000 por pedido). */
export const PAGE_SIZE = 1000;
export const MAX_ROWS = 10000;

type PageResult<T> = { data: T[] | null; error: unknown; count?: number | null };

export async function fetchAllPaged<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  max = MAX_ROWS,
): Promise<{ rows: T[]; count: number | null }> {
  const rows: T[] = [];
  let count: number | null = null;
  for (let from = 0; from < max; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, max) - 1;
    const { data, error, count: c } = await fetchPage(from, to);
    if (error) throw error;
    if (c != null) count = c;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < to - from + 1) break;
  }
  return { rows, count };
}
