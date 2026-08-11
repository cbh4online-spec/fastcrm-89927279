/**
 * Menu Overrides — personalização de menus por workspace (Super Admin).
 *
 * Cada item da navegação (grupo top-level, sub-grupo ou rota) pode ser
 * marcado como:
 *   - "visible" → comportamento normal
 *   - "locked"  → aparece com cadeado, sem navegação
 *   - "hidden"  → não aparece na sidebar nem na pesquisa global
 *
 * Herança: rota > sub-grupo (NavGroup) > grupo top-level > predefinido.
 */
import {
  ROUTE_MANIFEST,
  TOP_LEVEL_GROUPS,
  getTopLevelGroupForRoute,
  type RouteEntry,
} from "@/config/routeManifest";

export type MenuVisibility = "visible" | "locked" | "hidden";
export type MenuItemType = "top_group" | "nav_group" | "route";

export interface MenuOverride {
  item_type: MenuItemType;
  item_key: string;
  visibility: MenuVisibility;
}

export type MenuOverrideMap = Record<string, MenuVisibility>;

const composite = (type: MenuItemType, key: string) => `${type}:${key}`;

export function buildOverrideMap(overrides: MenuOverride[]): MenuOverrideMap {
  const map: MenuOverrideMap = {};
  for (const o of overrides) map[composite(o.item_type, o.item_key)] = o.visibility;
  return map;
}

export function getOverride(
  map: MenuOverrideMap,
  type: MenuItemType,
  key: string,
): MenuVisibility | undefined {
  return map[composite(type, key)];
}

const routeByKey = new Map(ROUTE_MANIFEST.map((r) => [r.key, r]));

/**
 * Resolve a visibilidade efectiva de uma rota, aplicando a herança
 * rota → sub-grupo → grupo top-level.
 */
export function resolveRouteVisibility(
  map: MenuOverrideMap,
  route: RouteEntry | string,
): MenuVisibility {
  const entry = typeof route === "string" ? routeByKey.get(route) : route;
  if (!entry) return "visible";

  const own = getOverride(map, "route", entry.key);
  if (own) return own;

  const navGroup = getOverride(map, "nav_group", entry.group);
  if (navGroup) return navGroup;

  const top = getTopLevelGroupForRoute(entry);
  if (top) {
    const topState = getOverride(map, "top_group", top);
    if (topState) return topState;
  }

  return "visible";
}

/** Estado efectivo de um sub-grupo (NavGroup), herdando do grupo top-level. */
export function resolveNavGroupVisibility(
  map: MenuOverrideMap,
  navGroup: string,
): MenuVisibility {
  const own = getOverride(map, "nav_group", navGroup);
  if (own) return own;
  const top = TOP_LEVEL_GROUPS.find((tg) => tg.navGroups.includes(navGroup as never));
  if (top) {
    const topState = getOverride(map, "top_group", top.key);
    if (topState) return topState;
  }
  return "visible";
}

export function resolveTopGroupVisibility(
  map: MenuOverrideMap,
  topGroup: string,
): MenuVisibility {
  return getOverride(map, "top_group", topGroup) ?? "visible";
}

/**
 * Rotas de administração global (backoffice do FastCRM). Um super admin nunca
 * pode perder o acesso a estas rotas por causa de overrides de menu de uma
 * workspace específica.
 */
export const GLOBAL_ADMIN_ROUTE_KEYS = new Set(["n"]);

export function isGlobalAdminRoute(route: RouteEntry | string | undefined): boolean {
  if (!route) return false;
  if (typeof route === "string") {
    if (GLOBAL_ADMIN_ROUTE_KEYS.has(route)) return true;
    return isGlobalAdminPath(route);
  }
  return GLOBAL_ADMIN_ROUTE_KEYS.has(route.key) || isGlobalAdminPath(route.href);
}

export function isGlobalAdminPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  const base = pathname.split("?")[0];
  return base === "/n" || base === "/n-v2" || base.startsWith("/n/") || base.startsWith("/n-v2/");
}

export const MENU_VISIBILITY_LABELS: Record<MenuVisibility, string> = {
  visible: "Visível",
  locked: "Com cadeado",
  hidden: "Oculto",
};

