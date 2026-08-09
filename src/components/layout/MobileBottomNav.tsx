import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";
import {
  ROUTE_MANIFEST,
  buildTopLevelSections,
  getTopLevelGroupForRoute,
  type TopLevelGroup,
} from "@/config/routeManifest";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useAppMode } from "@/hooks/useAppMode";
import { useMenuOverrideMap } from "@/hooks/useWorkspaceMenuOverrides";
import {
  resolveRouteVisibility,
  resolveNavGroupVisibility,
  resolveTopGroupVisibility,
} from "@/config/menuOverrides";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const PRIORITY: TopLevelGroup[] = ["inicio", "clientes", "vendas", "comunicacao"];
const FALLBACK: TopLevelGroup[] = ["produtos", "operacoes", "relatorios", "aplicacoes"];
const MAX_TABS = 4;

/**
 * Native-app-style bottom navigation (mobile only).
 * Deriva os tabs dinamicamente a partir de `buildTopLevelSections`, respeitando
 * permissões, módulos e modo. Máximo 4 tabs + "Mais" (abre a AdaptiveSidebar).
 */
export const MobileBottomNav = React.forwardRef<HTMLElement, MobileBottomNavProps>(function MobileBottomNav(
  { onMenuClick },
  _ref,
) {
  const location = useLocation();
  const { installedModuleIds } = useWorkspaceModules();
  const { canAccessMenu } = useMenuPermissions();
  const { mode } = useAppMode();
  const { map: menuOverrideMap } = useMenuOverrideMap();

  const sections = React.useMemo(() => {
    const keep = (item: { key: string }) =>
      resolveRouteVisibility(menuOverrideMap, item.key) === "visible";
    return buildTopLevelSections(installedModuleIds, canAccessMenu, mode)
      .filter((tg) => resolveTopGroupVisibility(menuOverrideMap, tg.key) === "visible")
      .map((tg) => ({
        ...tg,
        items: tg.items.filter(keep),
        subSections: tg.subSections
          .filter((s) => resolveNavGroupVisibility(menuOverrideMap, s.key) === "visible")
          .map((s) => ({ ...s, items: s.items.filter(keep) })),
      }));
  }, [installedModuleIds, canAccessMenu, mode, menuOverrideMap]);

  const byKey = React.useMemo(() => {
    const m = new Map<TopLevelGroup, (typeof sections)[number]>();
    sections.forEach((s) => m.set(s.key, s));
    return m;
  }, [sections]);

  const tabs = React.useMemo(() => {
    const chosen: TopLevelGroup[] = [];
    for (const key of PRIORITY) {
      const s = byKey.get(key);
      if (s && s.items.length > 0) chosen.push(key);
    }
    for (const key of FALLBACK) {
      if (chosen.length >= MAX_TABS) break;
      const s = byKey.get(key);
      if (s && s.items.length > 0 && !chosen.includes(key)) chosen.push(key);
    }
    return chosen
      .slice(0, MAX_TABS)
      .map((k) => {
        const s = byKey.get(k)!;
        return {
          key: k,
          label: s.label,
          icon: s.icon,
          to: s.items[0].href,
        };
      });
  }, [byKey]);

  // Grupo top-level da rota actual (para estado activo).
  const activeGroup = React.useMemo<TopLevelGroup | null>(() => {
    const path = location.pathname;
    let best: { len: number; group: TopLevelGroup | null } = { len: -1, group: null };
    for (const r of ROUTE_MANIFEST) {
      if (!r.href) continue;
      const matches = path === r.href || path.startsWith(r.href + "/");
      if (!matches) continue;
      if (r.href.length > best.len) {
        best = { len: r.href.length, group: getTopLevelGroupForRoute(r) };
      }
    }
    return best.group;
  }, [location.pathname]);

  const colCount = tabs.length + 1; // +1 para "Mais"
  const gridColsClass =
    colCount === 5 ? "grid-cols-5"
    : colCount === 4 ? "grid-cols-4"
    : colCount === 3 ? "grid-cols-3"
    : colCount === 2 ? "grid-cols-2"
    : "grid-cols-1";

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "bg-background/95 backdrop-blur-xl border-t border-border",
        "safe-area-pb mobile-tap-highlight-none"
      )}
    >
      <ul className={cn("grid h-16", gridColsClass)}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeGroup === tab.key;
          return (
            <li key={tab.key} className="flex">
              <NavLink
                to={tab.to}
                onClick={() => haptics.selection()}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                  "active:scale-95 transition-transform",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/10")} />
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
        <li className="flex">
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onMenuClick();
            }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground active:scale-95 transition-transform"
            aria-label="Abrir menu completo"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
});
