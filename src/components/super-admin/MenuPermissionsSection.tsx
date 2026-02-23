import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Shield, 
  Save, 
  RefreshCw,
  Crown,
  User,
  Eye,
  Building2,
  LayoutDashboard,
  Users,
  Mail,
  Briefcase,
  FileText,
  TrendingUp,
  Settings,
  Calendar,
  Zap,
  Package,
  Receipt,
  PieChart
} from "lucide-react";
import { MENU_KEYS } from "@/hooks/useMenuPermissions";

interface MenuPermission {
  id: string;
  role: string;
  menu_key: string;
  can_access: boolean;
  can_edit: boolean;
}

const ROLES = [
  { value: "owner", label: "Owner", icon: Crown, color: "text-amber-500" },
  { value: "admin", label: "Admin", icon: Shield, color: "text-blue-500" },
  { value: "agent", label: "Agente", icon: User, color: "text-green-500" },
  { value: "viewer", label: "Viewer", icon: Eye, color: "text-gray-500" },
  { value: "agency", label: "Agency", icon: Building2, color: "text-purple-500" },
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

// Group menus by category
type WorkspaceRole = "admin" | "agency" | "agent" | "owner" | "viewer";

const groupedMenus = MENUS.reduce((acc, menu) => {
  if (!acc[menu.group]) acc[menu.group] = [];
  acc[menu.group].push(menu);
  return acc;
}, {} as Record<string, typeof MENUS>);

export function MenuPermissionsSection() {
  const [pendingChanges, setPendingChanges] = useState<Map<string, { can_access: boolean; can_edit: boolean }>>(new Map());
  
  const queryClient = useQueryClient();

  const { data: permissions, isLoading, refetch } = useQuery({
    queryKey: ["menu-permissions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_permissions")
        .select("*");
      
      if (error) throw error;
      return data as MenuPermission[];
    },
  });

  const updatePermissions = useMutation({
    mutationFn: async (changes: Array<{ role: WorkspaceRole; menu_key: string; can_access: boolean; can_edit: boolean }>) => {
      for (const change of changes) {
        const { error } = await supabase
          .from("menu_permissions")
          .update({
            can_access: change.can_access,
            can_edit: change.can_edit,
          })
          .eq("role", change.role)
          .eq("menu_key", change.menu_key);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, changes) => {
      queryClient.invalidateQueries({ queryKey: ["menu-permissions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["menu-permissions"] });
      setPendingChanges(new Map());
      toast.success("Permissões atualizadas com sucesso");

      // Audit log
      supabase.rpc("log_admin_action", {
        p_action_type: "permissions_updated",
        p_target_type: "menu_permissions",
        p_target_id: null,
        p_details: { changes_count: changes.length, changes },
      });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar permissões: " + error.message);
    },
  });

  const getPermission = (role: string, menuKey: string): { can_access: boolean; can_edit: boolean } => {
    const changeKey = `${role}:${menuKey}`;
    if (pendingChanges.has(changeKey)) {
      return pendingChanges.get(changeKey)!;
    }
    const perm = permissions?.find(p => p.role === role && p.menu_key === menuKey);
    return {
      can_access: perm?.can_access ?? false,
      can_edit: perm?.can_edit ?? false,
    };
  };

  const handleToggle = (role: string, menuKey: string, field: "can_access" | "can_edit") => {
    // Owner always has full access
    if (role === "owner") return;
    
    const changeKey = `${role}:${menuKey}`;
    const current = getPermission(role, menuKey);
    
    const newValue = {
      ...current,
      [field]: !current[field],
    };
    
    // If disabling access, also disable edit
    if (field === "can_access" && !newValue.can_access) {
      newValue.can_edit = false;
    }
    
    // If enabling edit, also enable access
    if (field === "can_edit" && newValue.can_edit) {
      newValue.can_access = true;
    }
    
    setPendingChanges(prev => new Map(prev).set(changeKey, newValue));
  };

  const handleSave = () => {
    const changes: Array<{ role: WorkspaceRole; menu_key: string; can_access: boolean; can_edit: boolean }> = [];
    
    pendingChanges.forEach((value, key) => {
      const [role, menu_key] = key.split(":");
      changes.push({ role: role as WorkspaceRole, menu_key, ...value });
    });
    
    if (changes.length > 0) {
      updatePermissions.mutate(changes);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissões de Menu</h1>
          <p className="text-muted-foreground">
            Configura o acesso a cada menu por role
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleSave}
            disabled={pendingChanges.size === 0 || updatePermissions.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar ({pendingChanges.size})
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span>Acesso (visualizar)</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-green-500" />
              <span>Editar (criar/modificar)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      {Object.entries(groupedMenus).map(([group, menus]) => (
        <Card key={group}>
          <CardHeader className="py-3">
            <CardTitle className="text-lg">{group}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium w-40">Menu</th>
                    {ROLES.map((role) => (
                      <th key={role.value} className="text-center py-2 px-3 font-medium">
                        <div className="flex flex-col items-center gap-1">
                          <role.icon className={`h-4 w-4 ${role.color}`} />
                          <span className="text-xs">{role.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {menus.map((menu) => (
                    <tr key={menu.key} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <menu.icon className="h-4 w-4 text-muted-foreground" />
                          {menu.label}
                        </div>
                      </td>
                      {ROLES.map((role) => {
                        const perm = getPermission(role.value, menu.key);
                        const isOwner = role.value === "owner";
                        const hasChange = pendingChanges.has(`${role.value}:${menu.key}`);
                        
                        return (
                          <td key={role.value} className={`text-center py-2 px-3 ${hasChange ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                            <div className="flex items-center justify-center gap-3">
                              {/* Access checkbox */}
                              <div className="flex flex-col items-center">
                                <Checkbox
                                  checked={isOwner ? true : perm.can_access}
                                  onCheckedChange={() => handleToggle(role.value, menu.key, "can_access")}
                                  disabled={isOwner}
                                  className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                />
                              </div>
                              {/* Edit checkbox */}
                              <div className="flex flex-col items-center">
                                <Checkbox
                                  checked={isOwner ? true : perm.can_edit}
                                  onCheckedChange={() => handleToggle(role.value, menu.key, "can_edit")}
                                  disabled={isOwner || !perm.can_access}
                                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
