import { useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ROUTE_MANIFEST } from "@/config/routeManifest";
import { resolveElementVisibility, type MenuVisibility } from "@/config/menuOverrides";
import type { PageElementKind } from "@/config/pageElements";
import { useMenuOverrideMap } from "@/hooks/useWorkspaceMenuOverrides";

/** Resolve a routeKey a partir do pathname actual (prefixo mais longo). */
export function resolveRouteKeyFromPath(pathname: string): string | null {
  const base = pathname.split("?")[0];
  let best: { key: string; len: number } | null = null;
  for (const r of ROUTE_MANIFEST) {
    const href = r.href.split("?")[0];
    if (base === href || base.startsWith(`${href}/`)) {
      if (!best || href.length > best.len) best = { key: r.key, len: href.length };
    }
  }
  return best?.key ?? null;
}

/**
 * Visibilidade dos elementos internos da página actual (ou de uma rota indicada).
 * Camada de apresentação apenas — não substitui RLS.
 */
export function usePageElementVisibility(routeKeyOverride?: string) {
  const { pathname } = useLocation();
  const { map, isLoading } = useMenuOverrideMap();

  const routeKey = useMemo(
    () => routeKeyOverride ?? resolveRouteKeyFromPath(pathname),
    [routeKeyOverride, pathname],
  );

  const elementState = useCallback(
    (kind: PageElementKind, id: string): MenuVisibility => {
      if (!routeKey) return "visible";
      return resolveElementVisibility(map, routeKey, kind, id);
    },
    [map, routeKey],
  );

  const isElementVisible = useCallback(
    (kind: PageElementKind, id: string) => elementState(kind, id) !== "hidden",
    [elementState],
  );

  const isElementLocked = useCallback(
    (kind: PageElementKind, id: string) => elementState(kind, id) === "locked",
    [elementState],
  );

  return { routeKey, isLoading, elementState, isElementVisible, isElementLocked };
}
