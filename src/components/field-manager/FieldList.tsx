import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  MoreHorizontal,
  Edit2,
  Archive,
  Eye,
  EyeOff,
  Shield,
  History,
  Trash2,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Upload,
} from "lucide-react";
import { 
  useUpdateManagedField, 
  useArchiveField,
  useRestoreField,
  useReorderManagedFields 
} from "@/hooks/useManagedFields";
import { EditFieldDialog } from "./EditFieldDialog";
import { FieldAuditDialog } from "./FieldAuditDialog";
import type { ManagedField, FieldEntityType } from "@/types/fieldManager";
import { 
  FIELD_TYPE_LABELS, 
  ORIGIN_LABELS,
  ENTITY_TYPE_LABELS 
} from "@/types/fieldManager";
import { cn } from "@/lib/utils";

interface FieldListProps {
  fields: ManagedField[];
  entityType: FieldEntityType;
  isLoading: boolean;
  onCreateField: () => void;
}

export function FieldList({ fields, entityType, isLoading, onCreateField }: FieldListProps) {
  const [editingField, setEditingField] = useState<ManagedField | null>(null);
  const [auditField, setAuditField] = useState<ManagedField | null>(null);

  const updateField = useUpdateManagedField();
  const archiveField = useArchiveField();
  const restoreField = useRestoreField();

  const handleToggleVisibility = (field: ManagedField) => {
    updateField.mutate({
      id: field.id,
      is_visible: !field.is_visible,
    });
  };

  const getOriginBadge = (origin: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; icon?: React.ReactNode }> = {
      system: { variant: "secondary" },
      manual: { variant: "outline" },
      import: { variant: "default", icon: <Upload className="h-3 w-3 mr-1" /> },
      ai: { variant: "default", icon: <Sparkles className="h-3 w-3 mr-1" /> },
    };
    const config = variants[origin] || { variant: "outline" as const };
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.icon}
        {ORIGIN_LABELS[origin as keyof typeof ORIGIN_LABELS] || origin}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Settings2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">
                Sem campos personalizados
              </h3>
              <p className="text-muted-foreground">
                Ainda não existem campos personalizados para {ENTITY_TYPE_LABELS[entityType]}.
              </p>
            </div>
            <Button onClick={onCreateField}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro campo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Nome Interno</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-center">Visível</TableHead>
                <TableHead className="text-center">Obrigatório</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow 
                  key={field.id}
                  className={cn(
                    field.is_archived && "opacity-50 bg-muted/50"
                  )}
                >
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.label}</span>
                      {field.is_system && (
                        <Badge variant="secondary" className="text-xs">Sistema</Badge>
                      )}
                      {field.is_archived && (
                        <Badge variant="outline" className="text-xs text-destructive">
                          Arquivado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {field.internal_name}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getOriginBadge(field.origin)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={field.is_visible}
                      onCheckedChange={() => handleToggleVisibility(field)}
                      disabled={field.is_system || field.is_archived}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {field.required ? (
                      <Badge variant="default" className="text-xs">Sim</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Não</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingField(field)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleVisibility(field)}>
                          {field.is_visible ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Mostrar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAuditField(field)}>
                          <History className="h-4 w-4 mr-2" />
                          Ver Histórico
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {field.is_archived ? (
                          <DropdownMenuItem onClick={() => restoreField.mutate(field.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => archiveField.mutate(field.id)}
                            disabled={field.is_system}
                            className="text-destructive focus:text-destructive"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <EditFieldDialog
        field={editingField}
        open={!!editingField}
        onOpenChange={(open) => !open && setEditingField(null)}
      />

      <FieldAuditDialog
        field={auditField}
        open={!!auditField}
        onOpenChange={(open) => !open && setAuditField(null)}
      />
    </>
  );
}
