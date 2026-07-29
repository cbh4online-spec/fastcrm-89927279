import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Navegação entre registos ("anterior / seguinte") preservando a ordem
 * e os filtros da listagem de onde o utilizador veio.
 *
 * O contexto é guardado em sessionStorage por tipo de entidade.
 */

const STORAGE_PREFIX = "nav-ctx:";

interface StoredContext {
  ids: string[];
  basePath: string;
  savedAt: number;
}

function storageKey(entity: string) {
  return `${STORAGE_PREFIX}${entity}`;
}

export function saveEntityListNavigation(entity: string, ids: string[], basePath: string) {
  try {
    const payload: StoredContext = { ids, basePath, savedAt: Date.now() };
    sessionStorage.setItem(storageKey(entity), JSON.stringify(payload));
  } catch {
    // sessionStorage indisponível (modo privado / quota) — navegação simples continua a funcionar
  }
}

export function clearEntityListNavigation(entity: string) {
  try {
    sessionStorage.removeItem(storageKey(entity));
  } catch {
    /* noop */
  }
}

function readContext(entity: string): StoredContext | null {
  try {
    const raw = sessionStorage.getItem(storageKey(entity));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredContext;
    if (!parsed || !Array.isArray(parsed.ids) || typeof parsed.basePath !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface EntityListNavigation {
  hasContext: boolean;
  index: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
  goPrev: () => void;
  goNext: () => void;
}

/**
 * @param entity  identificador do tipo de entidade (ex.: "contact")
 * @param currentId  id do registo atualmente aberto
 * @param buildPath  opcional — constrói o caminho de destino (default: `${basePath}/${id}`)
 */
export function useEntityListNavigation(
  entity: string,
  currentId: string | undefined,
  buildPath?: (id: string, basePath: string) => string,
): EntityListNavigation {
  const navigate = useNavigate();

  const ctx = useMemo(() => (currentId ? readContext(entity) : null), [entity, currentId]);

  const ids = ctx?.ids ?? [];
  const index = currentId ? ids.indexOf(currentId) : -1;
  const hasContext = index >= 0 && ids.length > 1;

  const prevId = hasContext && index > 0 ? ids[index - 1] : null;
  const nextId = hasContext && index < ids.length - 1 ? ids[index + 1] : null;

  const go = useCallback(
    (targetId: string | null) => {
      if (!targetId || !ctx) return;
      const path = buildPath
        ? buildPath(targetId, ctx.basePath)
        : `${ctx.basePath}/${targetId}`;
      navigate(path);
    },
    [ctx, buildPath, navigate],
  );

  return {
    hasContext,
    index: hasContext ? index + 1 : 0,
    total: hasContext ? ids.length : 0,
    prevId,
    nextId,
    goPrev: () => go(prevId),
    goNext: () => go(nextId),
  };
}
