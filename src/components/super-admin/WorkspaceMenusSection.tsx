import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TOP_LEVEL_GROUPS,
  ROUTE_MANIFEST,
  NAV_GROUPS,
  getTopLevelGroupForRoute,
  type RouteEntry,
} from "@/config/routeManifest";
import {
  MENU_VISIBILITY_LABELS,
  getOverride,
  resolveNavGroupVisibility,
  resolveRouteVisibility,
  resolveTopGroupVisibility,
  type MenuItemType,
  type MenuVisibility,
} from "@/config/menuOverrides";
import { useWorkspaceMenuOverridesAdmin } from "@/hooks/useWorkspaceMenuOverrides";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Eye, EyeOff, Lock, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceOption {
  id: string;
  name: string;
  slug: string | null;
}

const VISIBILITY_OPTIONS: MenuVisibility[] = ["visible", "locked", "hidden"];

function VisibilityIcon({ state }: { state: MenuVisibility }) {
  if (state === "hidden") return <EyeOff className="h-3.5 w-3.5 text-destructive" />;
  if (state === "locked") return <Lock className="h-3.5 w-3.5 text-amber-500" />;
  return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
}

function VisibilitySelect({
  value,
  inherited,
  onChange,
  disabled,
}: {
  value: MenuVisibility;
  inherited: boolean;
  onChange: (v: MenuVisibility) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {inherited && (
        <Badge variant="outline" className="text-[10px] font-normal">
          herdado
        </Badge>
      )}
      <Select value={value} onValueChange={(v) => onChange(v as MenuVisibility)} disabled={disabled}>
        <SelectTrigger className="h-8 w-[168px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VISIBILITY_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              <span className="flex items-center gap-2">
                <VisibilityIcon state={opt} />
                {MENU_VISIBILITY_LABELS[opt]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function WorkspaceMenusSection() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const { data: workspaces = [], isLoading: loadingWs } = useQuery({
    queryKey: ["super-admin-workspaces-menu-picker"],
    staleTime: 60_000,
    queryFn: async (): Promise<WorkspaceOption[]> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return (data ?? []) as WorkspaceOption[];
    },
  });

  const { map, isLoading, setVisibility, setBulk, resetAll } =
    useWorkspaceMenuOverridesAdmin(workspaceId || undefined);

  const tree = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TOP_LEVEL_GROUPS.map((tg) => {
      const routes = ROUTE_MANIFEST.filter(
        (r) => r.visibleInSidebar && r.status === "active" && getTopLevelGroupForRoute(r) === tg.key,
      );
      const byNavGroup = new Map<string, RouteEntry[]>();
      for (const r of routes) {
        const list = byNavGroup.get(r.group) ?? [];
        list.push(r);
        byNavGroup.set(r.group, list);
      }
      const subGroups = Array.from(byNavGroup.entries())
        .map(([navGroup, items]) => ({
          navGroup,
          label: NAV_GROUPS.find((g) => g.key === navGroup)?.label ?? navGroup,
          items: items.filter(
            (r) => !q || r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q),
          ),
        }))
        .filter((sg) => sg.items.length > 0);

      const matchesGroup = !q || tg.label.toLowerCase().includes(q);
      return { tg, subGroups, visible: matchesGroup || subGroups.length > 0 };
    }).filter((n) => n.visible);
  }, [search]);

  const apply = (itemType: MenuItemType, itemKey: string, visibility: MenuVisibility) =>
    setVisibility.mutate({ itemType, itemKey, visibility });

  const applyGroupToAll = (topGroupKey: string, visibility: MenuVisibility) => {
    const node = tree.find((n) => n.tg.key === topGroupKey);
    if (!node) return;
    setBulk.mutate([
      { itemType: "top_group", itemKey: topGroupKey, visibility },
      ...node.subGroups.flatMap((sg) => [
        { itemType: "nav_group" as MenuItemType, itemKey: sg.navGroup, visibility },
        ...sg.items.map((r) => ({
          itemType: "route" as MenuItemType,
          itemKey: r.key,
          visibility,
        })),
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Menus por Workspace</h1>
        <p className="text-muted-foreground">
          Escolha o que cada workspace vê na barra lateral: visível, visível com cadeado ou oculto.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>
            As definições aplicam-se apenas à workspace seleccionada. Itens sem regra herdam do
            nível acima.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={workspaceId} onValueChange={setWorkspaceId} disabled={loadingWs}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder={loadingWs ? "A carregar…" : "Seleccionar workspace"} />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar menu ou página…"
              className="pl-8"
              disabled={!workspaceId}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!workspaceId || resetAll.isPending}
            onClick={() => resetAll.mutate()}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Repor predefinições
          </Button>
        </CardContent>
      </Card>

      {!workspaceId ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Seleccione uma workspace para configurar os menus.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Sem resultados para “{search}”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tree.map(({ tg, subGroups }) => {
            const groupState = resolveTopGroupVisibility(map, tg.key);
            const isOpen = openGroups[tg.key] ?? !!search;
            const GroupIcon = tg.icon;

            return (
              <Card key={tg.key}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={(o) => setOpenGroups((p) => ({ ...p, [tg.key]: o }))}
                >
                  <div className="flex items-center gap-3 p-3">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 text-left"
                        aria-label={`Expandir ${tg.label}`}
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isOpen && "rotate-90",
                          )}
                        />
                        <GroupIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tg.label}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {subGroups.reduce((n, sg) => n + sg.items.length, 0)} páginas
                        </Badge>
                      </button>
                    </CollapsibleTrigger>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden text-xs sm:inline-flex"
                      disabled={setBulk.isPending}
                      onClick={() => applyGroupToAll(tg.key, groupState)}
                    >
                      Aplicar a tudo
                    </Button>

                    <VisibilitySelect
                      value={groupState}
                      inherited={false}
                      onChange={(v) => apply("top_group", tg.key, v)}
                      disabled={setVisibility.isPending}
                    />
                  </div>

                  <CollapsibleContent>
                    <div className="space-y-4 border-t px-4 py-3">
                      {subGroups.map((sg) => {
                        const sgState = resolveNavGroupVisibility(map, sg.navGroup);
                        const sgOwn = getOverride(map, "nav_group", sg.navGroup);
                        return (
                          <div key={sg.navGroup} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {sg.label}
                              </span>
                              <VisibilitySelect
                                value={sgState}
                                inherited={!sgOwn}
                                onChange={(v) => apply("nav_group", sg.navGroup, v)}
                                disabled={setVisibility.isPending}
                              />
                            </div>

                            <div className="divide-y">
                              {sg.items.map((r) => {
                                const state = resolveRouteVisibility(map, r);
                                const own = getOverride(map, "route", r.key);
                                const ItemIcon = r.icon;
                                return (
                                  <div
                                    key={r.key}
                                    className="flex items-center justify-between gap-3 py-2 pl-3"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                      <span className="truncate text-sm">{r.label}</span>
                                      <span className="hidden truncate font-mono text-[11px] text-muted-foreground md:inline">
                                        {r.href}
                                      </span>
                                    </div>
                                    <VisibilitySelect
                                      value={state}
                                      inherited={!own}
                                      onChange={(v) => apply("route", r.key, v)}
                                      disabled={setVisibility.isPending}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WorkspaceMenusSection;
