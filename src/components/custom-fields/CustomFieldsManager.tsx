import { useState } from "react";
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  CustomField,
  CustomFieldEntityType,
  CustomFieldType,
} from "@/hooks/useCustomFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  boolean: "Sim/Não",
  select: "Seleção",
};

interface CustomFieldFormData {
  name: string;
  field_type: CustomFieldType;
  options: string;
  required: boolean;
}

const initialFormData: CustomFieldFormData = {
  name: "",
  field_type: "text",
  options: "",
  required: false,
};

export function CustomFieldsManager() {
  const [entityType, setEntityType] = useState<CustomFieldEntityType>("lead");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomFieldFormData>(initialFormData);

  const { data: fields = [], isLoading } = useCustomFields(entityType);
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  const handleOpenCreate = () => {
    setEditingField(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      field_type: field.field_type,
      options: field.options?.join(", ") || "",
      required: field.required,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const options = formData.field_type === "select"
      ? formData.options.split(",").map(o => o.trim()).filter(Boolean)
      : [];

    if (editingField) {
      await updateField.mutateAsync({
        id: editingField.id,
        name: formData.name.trim(),
        options,
        required: formData.required,
      });
    } else {
      await createField.mutateAsync({
        entity_type: entityType,
        name: formData.name.trim(),
        field_type: formData.field_type,
        options,
        required: formData.required,
        position: fields.length,
      });
    }

    setDialogOpen(false);
    setFormData(initialFormData);
    setEditingField(null);
  };

  const handleDelete = async () => {
    if (deleteFieldId) {
      await deleteField.mutateAsync(deleteFieldId);
      setDeleteFieldId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campos Personalizados</h2>
          <p className="text-sm text-muted-foreground">
            Crie campos personalizados para leads e oportunidades
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Campo
        </Button>
      </div>

      <Tabs value={entityType} onValueChange={(v) => setEntityType(v as CustomFieldEntityType)}>
        <TabsList>
          <TabsTrigger value="lead">Leads</TabsTrigger>
          <TabsTrigger value="opportunity">Oportunidades</TabsTrigger>
          <TabsTrigger value="contact">Contactos</TabsTrigger>
          <TabsTrigger value="company">Empresas</TabsTrigger>
        </TabsList>

        <TabsContent value={entityType} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">
                Ainda não tem campos personalizados para {
                  entityType === "lead" ? "leads" : 
                  entityType === "opportunity" ? "oportunidades" :
                  entityType === "contact" ? "contactos" : "empresas"
                }
              </p>
              <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro campo
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Opções</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell className="font-medium">{field.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {FIELD_TYPE_LABELS[field.field_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {field.field_type === "select" && field.options?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.options.slice(0, 3).map((opt) => (
                              <Badge key={opt} variant="outline" className="text-xs">
                                {opt}
                              </Badge>
                            ))}
                            {field.options.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{field.options.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {field.required ? (
                          <Badge variant="default">Sim</Badge>
                        ) : (
                          <span className="text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(field)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteFieldId(field.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Editar Campo" : "Novo Campo Personalizado"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Atualize as configurações do campo personalizado."
                : `Adicione um novo campo para ${
                    entityType === "lead" ? "leads" : 
                    entityType === "opportunity" ? "oportunidades" :
                    entityType === "contact" ? "contactos" : "empresas"
                  }.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Campo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Setor de Atividade"
                required
              />
            </div>

            {!editingField && (
              <div className="space-y-2">
                <Label htmlFor="field_type">Tipo de Campo *</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, field_type: value as CustomFieldType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.field_type === "select" && (
              <div className="space-y-2">
                <Label htmlFor="options">Opções (separadas por vírgula)</Label>
                <Input
                  id="options"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  placeholder="Opção 1, Opção 2, Opção 3"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="required">Campo obrigatório</Label>
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, required: checked })
                }
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.name.trim() ||
                  createField.isPending ||
                  updateField.isPending
                }
              >
                {editingField ? "Guardar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFieldId} onOpenChange={(open) => !open && setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O campo e todos os seus valores serão eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
