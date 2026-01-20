import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Building2,
  Users,
  Target,
  Briefcase,
  FileText,
  Package,
  Save,
  RefreshCw,
} from "lucide-react";

interface ObjectPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OBJECTS = [
  { key: "companies", label: "Empresas", icon: Building2 },
  { key: "contacts", label: "Contactos", icon: Users },
  { key: "leads", label: "Leads", icon: Target },
  { key: "opportunities", label: "Oportunidades", icon: Briefcase },
  { key: "proposals", label: "Propostas", icon: FileText },
  { key: "products", label: "Produtos", icon: Package },
];

const ROLES = [
  { key: "owner", label: "Owner" },
  { key: "admin", label: "Admin" },
  { key: "agent", label: "Agente" },
  { key: "viewer", label: "Viewer" },
  { key: "agency", label: "Agência" },
];

const PERMISSIONS = [
  { key: "view_all", label: "Ver Todos" },
  { key: "view_own", label: "Ver Próprios" },
  { key: "create", label: "Criar" },
  { key: "edit_all", label: "Editar Todos" },
  { key: "edit_own", label: "Editar Próprios" },
  { key: "delete_all", label: "Eliminar Todos" },
  { key: "delete_own", label: "Eliminar Próprios" },
];

interface ObjectPermission {
  id: string;
  workspace_id: string;
  object_key: string;
  role: string;
  permission_key: string;
  allowed: boolean;
}

export function ObjectPermissionsDialog({
  open,
  onOpenChange,
}: ObjectPermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [selectedObject, setSelectedObject] = useState("companies");
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(
    new Map()
  );

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["object-permissions", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("object_permissions")
        .select("*")
        .eq("workspace_id", currentWorkspace?.id);

      if (error) throw error;
      return data as ObjectPermission[];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changes = Array.from(pendingChanges.entries()).map(([key, allowed]) => {
        const [object_key, role, permission_key] = key.split("::");
        return { object_key, role, permission_key, allowed, workspace_id: currentWorkspace?.id };
      });

      for (const change of changes) {
        const { error } = await supabase
          .from("object_permissions")
          .upsert(change as any, { onConflict: "workspace_id,object_key,role,permission_key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object-permissions"] });
      setPendingChanges(new Map());
      toast({ title: "Permissões guardadas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao guardar permissões", variant: "destructive" });
    },
  });

  const getPermissionValue = (
    objectKey: string,
    role: string,
    permissionKey: string
  ): boolean => {
    const key = `${objectKey}::${role}::${permissionKey}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    const perm = permissions?.find(
      (p) =>
        p.object_key === objectKey &&
        p.role === role &&
        p.permission_key === permissionKey
    );
    return perm?.allowed ?? (role === "owner" || role === "admin");
  };

  const handleToggle = (
    objectKey: string,
    role: string,
    permissionKey: string
  ) => {
    if (role === "owner") return;

    const key = `${objectKey}::${role}::${permissionKey}`;
    const currentValue = getPermissionValue(objectKey, role, permissionKey);
    const newChanges = new Map(pendingChanges);
    newChanges.set(key, !currentValue);
    setPendingChanges(newChanges);
  };

  const selectedObjectData = OBJECTS.find((o) => o.key === selectedObject);
  const Icon = selectedObjectData?.icon || Building2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Permissões por Objeto
          </DialogTitle>
          <DialogDescription>
            Defina quem pode ver, criar, editar e eliminar cada tipo de registo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <Select value={selectedObject} onValueChange={setSelectedObject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OBJECTS.map((obj) => (
                <SelectItem key={obj.key} value={obj.key}>
                  <div className="flex items-center gap-2">
                    <obj.icon className="h-4 w-4" />
                    {obj.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {pendingChanges.size > 0 && (
            <Badge variant="secondary">{pendingChanges.size} alterações</Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["object-permissions"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={pendingChanges.size === 0 || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Função</th>
                    {PERMISSIONS.map((perm) => (
                      <th key={perm.key} className="text-center p-2 font-medium text-xs">
                        {perm.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role.key} className="border-t">
                      <td className="p-3 font-medium">{role.label}</td>
                      {PERMISSIONS.map((perm) => (
                        <td key={perm.key} className="text-center p-2">
                          <Checkbox
                            checked={getPermissionValue(
                              selectedObject,
                              role.key,
                              perm.key
                            )}
                            onCheckedChange={() =>
                              handleToggle(selectedObject, role.key, perm.key)
                            }
                            disabled={role.key === "owner"}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
