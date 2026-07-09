import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, Save, RefreshCw, User, Eye, Briefcase, Crown,
  ChevronRight, Search, Plus, Trash2, History, X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ROUTE_MANIFEST, NAV_GROUPS, type RouteEntry } from "@/config/routeManifest";
import { PermissionAuditTab } from "./PermissionAuditTab";
import { FieldDefaultsDialog } from "./FieldDefaultsDialog";
import { WorkspaceInstanceHealthBadge } from "./WorkspaceInstanceHealthBadge";

const SALES_FUNCTIONS = [
  { value: "vendedor", label: "Vendedor", icon: User, color: "text-green-500" },
  { value: "gestor", label: "Gestor", icon: Briefcase, color: "text-blue-500" },
  { value: "diretor", label: "Diretor", icon: Shield, color: "text-purple-500" },
  { value: "ceo", label: "CEO", icon: Crown, color: "text-amber-500" },
];

// Group sidebar-visible routes by nav group
function getGroupedRoutes() {
  const groups: { groupKey: string; groupLabel: string; groupIcon: any; items: RouteEntry[] }[] = [];

  for (const navGroup of NAV_GROUPS) {
    const items = ROUTE_MANIFEST.filter(
      (r) => r.group === navGroup.key && r.status === "active" && r.visibleInSidebar
    );
    if (items.length > 0) {
      groups.push({
        groupKey: navGroup.key,
        groupLabel: navGroup.label,
        groupIcon: navGroup.icon,
        items,
      });
    }
  }
  return groups;
}

// All routes (including search-only) for field-level control
function getAllRoutes() {
  return ROUTE_MANIFEST.filter((r) => r.status === "active");
}

interface MenuPerm {
  id: string;
  sales_function: string;
  menu_key: string;
  visible: boolean;
}

interface FieldPerm {
  id: string;
  sales_function: string;
  page_key: string;
  field_key: string;
  visible: boolean;
}

export function ProfilePermissionsSettings() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const groupedRoutes = useMemo(getGroupedRoutes, []);
  const [menuSearch, setMenuSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [activeProfile, setActiveProfile] = useState<string>("vendedor");
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Avisar ao sair da página com alterações por guardar
  useEffect(() => {
    const hasPending = menuChanges.size > 0 || fieldChanges.size > 0;
    if (!hasPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [menuChanges.size, fieldChanges.size]);
  const { data: menuPerms, isLoading: menuLoading } = useQuery({
    queryKey: ["profile-menu-permissions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("profile_menu_permissions")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data as MenuPerm[];
    },
    enabled: !!workspaceId,
  });

  const [menuChanges, setMenuChanges] = useState<Map<string, boolean>>(new Map());

  const getMenuVisible = (fn: string, menuKey: string): boolean => {
    const changeKey = `${fn}:${menuKey}`;
    if (menuChanges.has(changeKey)) return menuChanges.get(changeKey)!;
    const perm = menuPerms?.find((p) => p.sales_function === fn && p.menu_key === menuKey);
    return perm?.visible ?? true;
  };

  const toggleMenu = (fn: string, menuKey: string) => {
    const key = `${fn}:${menuKey}`;
    const current = getMenuVisible(fn, menuKey);
    setMenuChanges((prev) => new Map(prev).set(key, !current));
  };

  // Toggle all items in a group for a given function
  const toggleGroupAll = (fn: string, items: RouteEntry[], visible: boolean) => {
    setMenuChanges((prev) => {
      const next = new Map(prev);
      for (const item of items) {
        next.set(`${fn}:${item.key}`, visible);
      }
      return next;
    });
  };

  const isGroupAllVisible = (fn: string, items: RouteEntry[]) =>
    items.every((item) => getMenuVisible(fn, item.key));
  const isGroupNoneVisible = (fn: string, items: RouteEntry[]) =>
    items.every((item) => !getMenuVisible(fn, item.key));

  // Valida sessão + role owner/admin no workspace ativo. Devolve user.
  const assertCanManagePermissions = async () => {
    if (!workspaceId) throw new Error("Sem workspace ativo");
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      throw new Error("Sessão expirada ou utilizador não autenticado. Faça login novamente.");
    }
    // Super admin bypass: verifica papel global em user_roles via profile.id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id);
      if (roles?.some((r: any) => r.role === "super_admin")) {
        return user;
      }
    }

    const { data: member, error: memberErr } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (memberErr) throw new Error("Erro ao verificar permissões no workspace.");
    const allowedRoles = ["owner", "admin", "agency"];
    if (!member || !allowedRoles.includes(member.role)) {
      throw new Error(
        `Sem permissões para gerir permissões de campos. (role atual: ${member?.role ?? "nenhum"})`
      );
    }
    return user;
  };

  const saveMenus = useMutation({
    mutationFn: async () => {
      await assertCanManagePermissions();
      const norm = (s: string) => (s ?? "").trim().toLowerCase();
      const rows = Array.from(menuChanges.entries()).map(([key, visible]) => {
        const [sales_function, menu_key] = key.split(":");
        return {
          workspace_id: workspaceId,
          sales_function: norm(sales_function),
          menu_key: norm(menu_key),
          visible,
        };
      }).filter(r => r.sales_function && r.menu_key);
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("profile_menu_permissions")
        .upsert(rows, { onConflict: "workspace_id,sales_function,menu_key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMenuChanges(new Map());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile-menu-permissions", workspaceId], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["menu-permissions", workspaceId], refetchType: "active" }),
      ]);
      await queryClient.refetchQueries({ queryKey: ["profile-menu-permissions", workspaceId] });
      toast.success("Permissões de menus guardadas");
    },
    onError: (err: any) => toast.error(`Erro ao guardar: ${err?.message ?? "desconhecido"}`),
  });

  // ── Field permissions ──
  const { data: fieldPerms, isLoading: fieldLoading } = useQuery({
    queryKey: ["profile-field-permissions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("profile_field_permissions")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data as FieldPerm[];
    },
    enabled: !!workspaceId,
  });

  const [fieldChanges, setFieldChanges] = useState<Map<string, boolean>>(new Map());
  const [newFieldForm, setNewFieldForm] = useState<{ page_key: string; field_key: string; label: string } | null>(null);

  const getFieldVisible = (fn: string, pageKey: string, fieldKey: string): boolean => {
    const changeKey = `${fn}:${pageKey}:${fieldKey}`;
    if (fieldChanges.has(changeKey)) return fieldChanges.get(changeKey)!;
    const perm = fieldPerms?.find(
      (p) => p.sales_function === fn && p.page_key === pageKey && p.field_key === fieldKey
    );
    return perm?.visible ?? true;
  };

  const toggleField = (fn: string, pageKey: string, fieldKey: string) => {
    const key = `${fn}:${pageKey}:${fieldKey}`;
    const current = getFieldVisible(fn, pageKey, fieldKey);
    setFieldChanges((prev) => new Map(prev).set(key, !current));
  };

  const saveFields = useMutation({
    mutationFn: async () => {
      await assertCanManagePermissions();
      const norm = (s: string) => (s ?? "").trim().toLowerCase();
      const rows = Array.from(fieldChanges.entries()).map(([key, visible]) => {
        const [sales_function, page_key, field_key] = key.split(":");
        return {
          workspace_id: workspaceId,
          sales_function: norm(sales_function),
          page_key: norm(page_key),
          field_key: norm(field_key),
          visible,
        };
      }).filter(r => r.sales_function && r.page_key && r.field_key);
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("profile_field_permissions")
        .upsert(rows, { onConflict: "workspace_id,sales_function,page_key,field_key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      setFieldChanges(new Map());
      await queryClient.invalidateQueries({ queryKey: ["profile-field-permissions", workspaceId], refetchType: "active" });
      await queryClient.refetchQueries({ queryKey: ["profile-field-permissions", workspaceId] });
      toast.success("Permissões de campos guardadas");
    },
    onError: (err: any) => toast.error(`Erro ao guardar: ${err?.message ?? "desconhecido"}`),
  });

  // Group field perms by page_key
  const fieldsByPage = useMemo(() => {
    if (!fieldPerms) return {};
    const map: Record<string, Set<string>> = {};
    for (const p of fieldPerms) {
      if (!map[p.page_key]) map[p.page_key] = new Set();
      map[p.page_key].add(p.field_key);
    }
    return map;
  }, [fieldPerms]);

  // Also include new fields from changes
  const allFieldsByPage = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    // From DB
    for (const [pageKey, fields] of Object.entries(fieldsByPage)) {
      map[pageKey] = new Set(fields);
    }
    // From pending changes
    for (const key of fieldChanges.keys()) {
      const [, pageKey, fieldKey] = key.split(":");
      if (!map[pageKey]) map[pageKey] = new Set();
      map[pageKey].add(fieldKey);
    }
    return map;
  }, [fieldsByPage, fieldChanges]);

  // Get route labels for field pages
  const routeLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of ROUTE_MANIFEST) {
      map[r.key] = r.label;
    }
    return map;
  }, []);

  // Filter grouped routes by search
  const filteredGroups = useMemo(() => {
    if (!menuSearch.trim()) return groupedRoutes;
    const q = menuSearch.toLowerCase();
    return groupedRoutes
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groupedRoutes, menuSearch]);

  if (menuLoading || fieldLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Permissões por Perfil Comercial
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure quais menus, sub-menus e campos cada perfil comercial pode ver. Estas regras restringem adicionalmente as permissões de role do workspace.
          </p>
        </div>
        <WorkspaceInstanceHealthBadge />
      </div>

      <Tabs defaultValue="menus">
        <TabsList>
          <TabsTrigger value="menus">Menus & Sub-menus</TabsTrigger>
          <TabsTrigger value="fields">Campos por Página</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-3.5 w-3.5 mr-1" />Auditoria</TabsTrigger>
        </TabsList>

        {/* ── TAB: Menus & Sub-menus (estilo IX — um perfil de cada vez) ── */}
        <TabsContent value="menus" className="space-y-4">
          {/* Seletor de perfil — chips grandes tipo IX */}
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Escolhe o perfil a configurar
            </p>
            <div className="flex flex-wrap gap-2">
              {SALES_FUNCTIONS.map((fn) => {
                const active = activeProfile === fn.value;
                const Icon = fn.icon;
                return (
                  <button
                    key={fn.value}
                    type="button"
                    onClick={() => setActiveProfile(fn.value)}
                    className={cn(
                      "flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "" : fn.color)} />
                    {fn.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pesquisa + ações principais */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar menus…"
                  className="pl-10 h-12 rounded-full border-border"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
                {menuSearch && (
                  <button
                    type="button"
                    onClick={() => setMenuSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                    aria-label="Limpar pesquisa"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => queryClient.refetchQueries({ queryKey: ["profile-menu-permissions", workspaceId] })}
                title="Recarregar"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lista de menus agrupados */}
          <div className="rounded-2xl border bg-card divide-y">
            {filteredGroups.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Sem resultados para "{menuSearch}".
              </div>
            )}
            {filteredGroups.map((group) => {
              const isOpen = openGroups[group.groupKey] ?? true;
              const GroupIcon = group.groupIcon;
              const allVisible = isGroupAllVisible(activeProfile, group.items);
              const visibleCount = group.items.filter((i) => getMenuVisible(activeProfile, i.key)).length;

              return (
                <Collapsible
                  key={group.groupKey}
                  open={isOpen}
                  onOpenChange={(val) => setOpenGroups((prev) => ({ ...prev, [group.groupKey]: val }))}
                >
                  {/* Header do grupo */}
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-90"
                        )}
                      />
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <GroupIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{group.groupLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {visibleCount} de {group.items.length} ativos
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <button
                      type="button"
                      onClick={() => toggleGroupAll(activeProfile, group.items, !allVisible)}
                      className={cn(
                        "h-8 px-3 rounded-full border text-xs font-medium transition-colors",
                        allVisible
                          ? "border-border text-muted-foreground hover:bg-muted"
                          : "border-primary text-primary hover:bg-primary/5"
                      )}
                    >
                      {allVisible ? "Desativar todos" : "Ativar todos"}
                    </button>
                  </div>

                  <CollapsibleContent>
                    <div className="divide-y border-t bg-muted/10">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const visible = getMenuVisible(activeProfile, item.key);
                        return (
                          <label
                            key={item.key}
                            className="flex items-center gap-3 pl-16 pr-5 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                          >
                            <ItemIcon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                visible ? "text-foreground" : "text-muted-foreground/50"
                              )}
                            />
                            <span
                              className={cn(
                                "flex-1 text-sm transition-colors",
                                visible ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40"
                              )}
                            >
                              {item.label}
                            </span>
                            {item.isPro && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">PRO</Badge>
                            )}
                            {item.isBeta && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">BETA</Badge>
                            )}
                            <Switch
                              checked={visible}
                              onCheckedChange={() => toggleMenu(activeProfile, item.key)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {/* Barra de guardar fixa em baixo quando há alterações */}
          {menuChanges.size > 0 && (
            <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-lg">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="rounded-full">
                  {menuChanges.size}
                </Badge>
                <span className="text-muted-foreground">
                  {menuChanges.size === 1 ? "alteração por guardar" : "alterações por guardar"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMenuChanges(new Map())}>
                  Descartar
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMenus.mutate()}
                  disabled={saveMenus.isPending}
                  className="rounded-full px-5"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Guardar alterações
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Fields ── */}
        <TabsContent value="fields">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Visibilidade de Campos</CardTitle>
                  <CardDescription>Esconda campos sensíveis dentro de cada página por perfil. Adicione novos campos conforme necessário.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {fieldChanges.size > 0 && (
                    <Badge variant="secondary">{fieldChanges.size} alteração(ões)</Badge>
                  )}
                  <FieldDefaultsDialog pageKeys={Object.keys(allFieldsByPage)} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => queryClient.refetchQueries({ queryKey: ["profile-field-permissions", workspaceId] })}
                    title="Recarregar do servidor"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setFieldChanges(new Map())} disabled={fieldChanges.size === 0}>
                    Repor
                  </Button>
                  <Button size="sm" onClick={() => saveFields.mutate()} disabled={fieldChanges.size === 0 || saveFields.isPending}>
                    <Save className="h-4 w-4 mr-1" /> Guardar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(allFieldsByPage).length === 0 && !newFieldForm && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Nenhum campo configurado ainda. Adicione campos para controlar visibilidade por perfil.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setNewFieldForm({ page_key: "", field_key: "", label: "" })}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Campo
                  </Button>
                </div>
              )}

              {Object.entries(allFieldsByPage).map(([pageKey, fieldKeys]) => (
                <div key={pageKey}>
                  <h4 className="text-sm font-medium mb-3 text-foreground flex items-center gap-2">
                    <span className="capitalize">{routeLabelMap[pageKey] || pageKey}</span>
                    <Badge variant="outline" className="text-[10px]">{pageKey}</Badge>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Campo</th>
                          {SALES_FUNCTIONS.map((fn) => (
                            <th key={fn.value} className="text-center py-2 px-3 font-medium">
                              <div className="flex flex-col items-center gap-0.5">
                                <fn.icon className={`h-3.5 w-3.5 ${fn.color}`} />
                                <span className="text-[10px]">{fn.label}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(fieldKeys).map((fieldKey) => (
                          <tr key={fieldKey} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 pr-4">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{fieldKey}</code>
                            </td>
                            {SALES_FUNCTIONS.map((fn) => (
                              <td key={fn.value} className="text-center py-2 px-3">
                                <Checkbox
                                  checked={getFieldVisible(fn.value, pageKey, fieldKey)}
                                  onCheckedChange={() => toggleField(fn.value, pageKey, fieldKey)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Add new field form */}
              {newFieldForm ? (
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Página (key)</label>
                        <Input
                          placeholder="ex: pipeline, leads, contacts"
                          value={newFieldForm.page_key}
                          onChange={(e) => setNewFieldForm({ ...newFieldForm, page_key: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Campo (key)</label>
                        <Input
                          placeholder="ex: margin, cost, commission"
                          value={newFieldForm.field_key}
                          onChange={(e) => setNewFieldForm({ ...newFieldForm, field_key: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!newFieldForm.page_key.trim() || !newFieldForm.field_key.trim()}
                        onClick={() => {
                          // Add field visibility for all functions (default visible)
                          const next = new Map(fieldChanges);
                          for (const fn of SALES_FUNCTIONS) {
                            next.set(`${fn.value}:${newFieldForm.page_key}:${newFieldForm.field_key}`, true);
                          }
                          setFieldChanges(next);
                          setNewFieldForm(null);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Adicionar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setNewFieldForm(null)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setNewFieldForm({ page_key: "", field_key: "", label: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Campo
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <PermissionAuditTab workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
