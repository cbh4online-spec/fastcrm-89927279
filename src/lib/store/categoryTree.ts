/**
 * Árvore de categorias públicas da loja (product_categories.parent_id).
 * Raízes visíveis = menu; filhos ocultos continuam a resolver links antigos.
 */
export interface CategoryNode {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  store_visible: boolean;
}

/** IDs da categoria e de todos os descendentes (mesmo workspace, protegido contra ciclos). */
export function descendantIds(nodes: CategoryNode[], rootId: string): string[] {
  const root = nodes.find((n) => n.id === rootId);
  if (!root) return [rootId];
  const children = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parent_id || n.workspace_id !== root.workspace_id) continue;
    const list = children.get(n.parent_id) || [];
    list.push(n.id);
    children.set(n.parent_id, list);
  }
  const seen = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of children.get(id) || []) {
      if (!seen.has(c)) {
        seen.add(c);
        stack.push(c);
      }
    }
  }
  return Array.from(seen);
}

/** Raiz de topo de uma categoria (ou a própria, se órfã/ciclo). */
export function rootOf(nodes: CategoryNode[], id: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur?.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = byId.get(cur.parent_id);
  }
  return cur?.id ?? id;
}

/**
 * Contagem por raiz visível: cada produto conta uma única vez, na raiz do seu
 * store_category_id. Produtos de outro workspace ou sem categoria são ignorados.
 */
export function countByVisibleRoot(
  nodes: CategoryNode[],
  products: { store_category_id: string | null; workspace_id?: string }[],
  workspaceId: string,
): Record<string, number> {
  const scoped = nodes.filter((n) => n.workspace_id === workspaceId);
  const ids = new Set(scoped.map((n) => n.id));
  const counts: Record<string, number> = {};
  for (const p of products) {
    if (!p.store_category_id || !ids.has(p.store_category_id)) continue;
    if (p.workspace_id && p.workspace_id !== workspaceId) continue;
    const root = rootOf(scoped, p.store_category_id);
    counts[root] = (counts[root] || 0) + 1;
  }
  return counts;
}

export function visibleRoots<T extends CategoryNode>(nodes: T[], workspaceId: string): T[] {
  return nodes.filter((n) => n.workspace_id === workspaceId && !n.parent_id && n.store_visible);
}
