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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";

interface FieldPermissionsDialogProps {
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

const OBJECT_FIELDS: Record<string, { key: string; label: string }[]> = {
  companies: [
    { key: "name", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "tax_id", label: "NIF" },
    { key: "address", label: "Morada" },
    { key: "annual_revenue", label: "Receita Anual" },
    { key: "employee_count", label: "Nº Funcionários" },
    { key: "notes", label: "Notas" },
  ],
  contacts: [
    { key: "name", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "mobile", label: "Telemóvel" },
    { key: "position", label: "Cargo" },
    { key: "notes", label: "Notas" },
  ],
  leads: [
    { key: "name", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "source", label: "Origem" },
    { key: "value", label: "Valor" },
    { key: "notes", label: "Notas" },
  ],
  opportunities: [
    { key: "title", label: "Título" },
    { key: "value", label: "Valor" },
    { key: "probability", label: "Probabilidade" },
    { key: "expected_close_date", label: "Data Fecho Prevista" },
    { key: "notes", label: "Notas" },
  ],
  proposals: [
    { key: "title", label: "Título" },
    { key: "total", label: "Total" },
    { key: "discount", label: "Desconto" },
    { key: "notes", label: "Notas" },
  ],
  products: [
    { key: "name", label: "Nome" },
    { key: "price", label: "Preço" },
    { key: "cost", label: "Custo" },
    { key: "margin", label: "Margem" },
    { key: "description", label: "Descrição" },
  ],
};

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "agent", label: "Agente" },
  { key: "viewer", label: "Viewer" },
  { key: "agency", label: "Agência" },
];

type PermissionLevel = "hidden" | "view" | "edit";

interface FieldPermission {
  id: string;
  workspace_id: string;
  object_key: string;
  role: string;
  field_key: string;
  permission_level: PermissionLevel;
}

export function FieldPermissionsDialog({
  open,
  onOpenChange,
}: FieldPermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [selectedObject, setSelectedObject] = useState("companies");
  const [selectedRole, setSelectedRole] = useState("agent");
  const [pendingChanges, setPendingChanges] = useState<Map<string, PermissionLevel>>(
    new Map()
  );

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["field-permissions", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_permissions")
        .select("*")
        .eq("workspace_id", currentWorkspace?.id);

      if (error) throw error;
      return data as FieldPermission[];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changes = Array.from(pendingChanges.entries()).map(([key, level]) => {
        const [object_key, role, field_key] = key.split("::");
        return {
          object_key,
          role,
          field_key,
          permission_level: level,
          workspace_id: currentWorkspace?.id,
        };
      });

      for (const change of changes) {
        const { error } = await supabase
          .from("field_permissions")
          .upsert(change as any, { onConflict: "workspace_id,object_key,role,field_key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-permissions"] });
      setPendingChanges(new Map());
      toast({ title: "Permissões de campo guardadas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao guardar permissões", variant: "destructive" });
    },
  });

  const getPermissionLevel = (
    objectKey: string,
    role: string,
    fieldKey: string
  ): PermissionLevel => {
    const key = `${objectKey}::${role}::${fieldKey}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    const perm = permissions?.find(
      (p) =>
        p.object_key === objectKey &&
        p.role === role &&
        p.field_key === fieldKey
    );
    return perm?.permission_level ?? "edit";
  };

  const handleChange = (
    objectKey: string,
    role: string,
    fieldKey: string,
    level: PermissionLevel
  ) => {
    const key = `${objectKey}::${role}::${fieldKey}`;
    const newChanges = new Map(pendingChanges);
    newChanges.set(key, level);
    setPendingChanges(newChanges);
  };

  const fields = OBJECT_FIELDS[selectedObject] || [];
  const selectedObjectData = OBJECTS.find((o) => o.key === selectedObject);
  const Icon = selectedObjectData?.icon || Building2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Permissões por Campo
          </DialogTitle>
          <DialogDescription>
            Defina quem pode ver ou editar cada campo específico.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <Select value={selectedObject} onValueChange={setSelectedObject}>
            <SelectTrigger className="w-[180px]">
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

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.key} value={role.key}>
                  {role.label}
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
            onClick={() => queryClient.invalidateQueries({ queryKey: ["field-permissions"] })}
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
            <div className="space-y-3">
              {fields.map((field) => {
                const level = getPermissionLevel(
                  selectedObject,
                  selectedRole,
                  field.key
                );
                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-medium">{field.label}</span>
                    <RadioGroup
                      value={level}
                      onValueChange={(value) =>
                        handleChange(
                          selectedObject,
                          selectedRole,
                          field.key,
                          value as PermissionLevel
                        )
                      }
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hidden" id={`${field.key}-hidden`} />
                        <Label
                          htmlFor={`${field.key}-hidden`}
                          className="flex items-center gap-1 text-sm cursor-pointer"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Oculto
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="view" id={`${field.key}-view`} />
                        <Label
                          htmlFor={`${field.key}-view`}
                          className="flex items-center gap-1 text-sm cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="edit" id={`${field.key}-edit`} />
                        <Label
                          htmlFor={`${field.key}-edit`}
                          className="flex items-center gap-1 text-sm cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
