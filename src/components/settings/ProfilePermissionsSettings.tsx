import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Shield, Save, RefreshCw, User, Eye, Briefcase, Crown,
  LayoutDashboard, Users, Mail, Building2, TrendingUp,
  Settings, Calendar, Zap, Package, Receipt, PieChart, FileText,
} from "lucide-react";

const SALES_FUNCTIONS = [
  { value: "vendedor", label: "Vendedor", icon: User, color: "text-green-500" },
  { value: "gestor", label: "Gestor", icon: Briefcase, color: "text-blue-500" },
  { value: "diretor", label: "Diretor", icon: Shield, color: "text-purple-500" },
  { value: "ceo", label: "CEO", icon: Crown, color: "text-amber-500" },
];

const MENUS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Principal" },
  { key: "feed", label: "Feed", icon: TrendingUp, group: "Principal" },
  { key: "productivity", label: "Produtividade", icon: Zap, group: "Principal" },
  { key: "inbox", label: "Inbox", icon: Mail, group: "Comunicação" },
  { key: "crm", label: "CRM", icon: Users, group: "CRM" },
  { key: "leads", label: "Leads", icon: Users, group: "CRM" },
  { key: "contacts", label: "Contactos", icon: Users, group: "CRM" },
  { key: "companies", label: "Empresas", icon: Building2, group: "CRM" },
  { key: "pipeline", label: "Pipeline", icon: Briefcase, group: "Vendas" },
  { key: "proposals", label: "Propostas", icon: FileText, group: "Vendas" },
  { key: "invoices", label: "Faturas", icon: Receipt, group: "Vendas" },
  { key: "products", label: "Produtos", icon: Package, group: "Vendas" },
  { key: "marketing", label: "Marketing", icon: TrendingUp, group: "Marketing" },
  { key: "automations", label: "Automações", icon: Zap, group: "Marketing" },
  { key: "reports", label: "Relatórios", icon: PieChart, group: "Relatórios" },
  { key: "calendar", label: "Calendário", icon: Calendar, group: "Ferramentas" },
  { key: "settings", label: "Configurações", icon: Settings, group: "Sistema" },
  { key: "team", label: "Equipa", icon: Users, group: "Sistema" },
  { key: "integrations", label: "Integrações", icon: Zap, group: "Sistema" },
];

const groupedMenus = MENUS.reduce((acc, menu) => {
  if (!acc[menu.group]) acc[menu.group] = [];
  acc[menu.group].push(menu);
  return acc;
}, {} as Record<string, typeof MENUS>);

const FIELD_PAGES = [
  { key: "pipeline", label: "Pipeline" },
  { key: "leads", label: "Leads" },
  { key: "contacts", label: "Contactos" },
  { key: "companies", label: "Empresas" },
  { key: "dashboard", label: "Dashboard" },
];

const FIELDS_BY_PAGE: Record<string, { key: string; label: string }[]> = {
  pipeline: [
    { key: "margin", label: "Margem" },
    { key: "cost", label: "Custo" },
    { key: "commission", label: "Comissão" },
  ],
  leads: [
    { key: "source_cost", label: "Custo da Fonte" },
  ],
  contacts: [],
  companies: [],
  dashboard: [],
};

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

  // ── Menu permissions ──
  const { data: menuPerms, isLoading: menuLoading } = useQuery({
    queryKey: ["profile-menu-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_menu_permissions").select("*");
      if (error) throw error;
      return data as MenuPerm[];
    },
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

  const saveMenus = useMutation({
    mutationFn: async () => {
      const entries = Array.from(menuChanges.entries());
      for (const [key, visible] of entries) {
        const [sales_function, menu_key] = key.split(":");
        const existing = menuPerms?.find(
          (p) => p.sales_function === sales_function && p.menu_key === menu_key
        );
        if (existing) {
          await supabase
            .from("profile_menu_permissions")
            .update({ visible })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("profile_menu_permissions")
            .insert({ sales_function, menu_key, visible });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-menu-permissions"] });
      setMenuChanges(new Map());
      toast.success("Permissões de menus guardadas");
    },
    onError: () => toast.error("Erro ao guardar permissões de menus"),
  });

  // ── Field permissions ──
  const { data: fieldPerms, isLoading: fieldLoading } = useQuery({
    queryKey: ["profile-field-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_field_permissions").select("*");
      if (error) throw error;
      return data as FieldPerm[];
    },
  });

  const [fieldChanges, setFieldChanges] = useState<Map<string, boolean>>(new Map());

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
      const entries = Array.from(fieldChanges.entries());
      for (const [key, visible] of entries) {
        const [sales_function, page_key, field_key] = key.split(":");
        const existing = fieldPerms?.find(
          (p) => p.sales_function === sales_function && p.page_key === page_key && p.field_key === field_key
        );
        if (existing) {
          await supabase
            .from("profile_field_permissions")
            .update({ visible })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("profile_field_permissions")
            .insert({ sales_function, page_key, field_key, visible });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-field-permissions"] });
      setFieldChanges(new Map());
      toast.success("Permissões de campos guardadas");
    },
    onError: () => toast.error("Erro ao guardar permissões de campos"),
  });

  if (menuLoading || fieldLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Permissões por Perfil Comercial
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure quais menus e campos cada perfil comercial pode ver. Estas regras restringem adicionalmente as permissões de role do workspace.
        </p>
      </div>

      <Tabs defaultValue="menus">
        <TabsList>
          <TabsTrigger value="menus">Menus por Perfil</TabsTrigger>
          <TabsTrigger value="fields">Campos por Perfil</TabsTrigger>
        </TabsList>

        {/* ── TAB: Menus ── */}
        <TabsContent value="menus">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Visibilidade de Menus</CardTitle>
                  <CardDescription>Controle quais menus aparecem na sidebar para cada perfil</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {menuChanges.size > 0 && (
                    <Badge variant="secondary">{menuChanges.size} alteração(ões)</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMenuChanges(new Map())}
                    disabled={menuChanges.size === 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Repor
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveMenus.mutate()}
                    disabled={menuChanges.size === 0 || saveMenus.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" /> Guardar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Menu</th>
                      {SALES_FUNCTIONS.map((fn) => (
                        <th key={fn.value} className="text-center py-2 px-3 font-medium">
                          <div className="flex flex-col items-center gap-1">
                            <fn.icon className={`h-4 w-4 ${fn.color}`} />
                            <span className="text-xs">{fn.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedMenus).map(([group, menus]) => (
                      <>
                        <tr key={`g-${group}`}>
                          <td colSpan={5} className="pt-4 pb-1 font-medium text-xs uppercase text-muted-foreground tracking-wider">
                            {group}
                          </td>
                        </tr>
                        {menus.map((menu) => (
                          <tr key={menu.key} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                <menu.icon className="h-4 w-4 text-muted-foreground" />
                                <span>{menu.label}</span>
                              </div>
                            </td>
                            {SALES_FUNCTIONS.map((fn) => (
                              <td key={fn.value} className="text-center py-2 px-3">
                                <Checkbox
                                  checked={getMenuVisible(fn.value, menu.key)}
                                  onCheckedChange={() => toggleMenu(fn.value, menu.key)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Fields ── */}
        <TabsContent value="fields">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Visibilidade de Campos</CardTitle>
                  <CardDescription>Esconda campos sensíveis por perfil comercial</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {fieldChanges.size > 0 && (
                    <Badge variant="secondary">{fieldChanges.size} alteração(ões)</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFieldChanges(new Map())}
                    disabled={fieldChanges.size === 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Repor
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveFields.mutate()}
                    disabled={fieldChanges.size === 0 || saveFields.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" /> Guardar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {FIELD_PAGES.filter((p) => (FIELDS_BY_PAGE[p.key] || []).length > 0).map((page) => (
                <div key={page.key}>
                  <h4 className="text-sm font-medium mb-3 text-foreground">{page.label}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Campo</th>
                          {SALES_FUNCTIONS.map((fn) => (
                            <th key={fn.value} className="text-center py-2 px-3 font-medium">
                              <div className="flex flex-col items-center gap-1">
                                <fn.icon className={`h-4 w-4 ${fn.color}`} />
                                <span className="text-xs">{fn.label}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {FIELDS_BY_PAGE[page.key].map((field) => (
                          <tr key={field.key} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 pr-4">{field.label}</td>
                            {SALES_FUNCTIONS.map((fn) => (
                              <td key={fn.value} className="text-center py-2 px-3">
                                <Checkbox
                                  checked={getFieldVisible(fn.value, page.key, field.key)}
                                  onCheckedChange={() => toggleField(fn.value, page.key, field.key)}
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
              {FIELD_PAGES.every((p) => (FIELDS_BY_PAGE[p.key] || []).length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum campo configurável disponível ainda.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
