import { useState, useCallback } from "react";
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  useReorderCustomFields,
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
import { Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
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
  is_unique: boolean;
  position: number;
}

const initialFormData: CustomFieldFormData = {
  name: "",
  field_type: "text",
  options: "",
  required: false,
  is_unique: false,
  position: 0,
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
  const reorderFields = useReorderCustomFields();

  const handleOpenCreate = () => {
    setEditingField(null);
    setFormData({
      ...initialFormData,
      position: fields.length, // Default to last position
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      field_type: field.field_type,
      options: field.options?.join(", ") || "",
      required: field.required,
      is_unique: field.is_unique,
      position: field.position,
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
      // Check if position changed
      const positionChanged = formData.position !== editingField.position;
      
      await updateField.mutateAsync({
        id: editingField.id,
        name: formData.name.trim(),
        options,
        required: formData.required,
        is_unique: formData.is_unique,
        position: formData.position,
      });

      // If position changed, reorder other fields
      if (positionChanged) {
        const updatedFields = [...fields]
          .filter(f => f.id !== editingField.id)
          .sort((a, b) => a.position - b.position);
        
        // Insert at new position and recalculate
        updatedFields.splice(formData.position, 0, { ...editingField, position: formData.position } as CustomField);
        
        const reorderedFields = updatedFields.map((f, index) => ({
          id: f.id,
          position: index,
        }));
        
        await reorderFields.mutateAsync(reorderedFields);
      }
    } else {
      // Create new field at specified position
      const newPosition = formData.position;
      
      // Shift existing fields if necessary
      if (newPosition < fields.length) {
        const fieldsToShift = fields
          .filter(f => f.position >= newPosition)
          .map(f => ({
            id: f.id,
            position: f.position + 1,
          }));
        
        if (fieldsToShift.length > 0) {
          await reorderFields.mutateAsync(fieldsToShift);
        }
      }

      await createField.mutateAsync({
        entity_type: entityType,
        name: formData.name.trim(),
        field_type: formData.field_type,
        options,
        required: formData.required,
        is_unique: formData.is_unique,
        position: newPosition,
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

  const moveField = useCallback(async (fieldId: string, direction: "up" | "down") => {
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    // Swap positions
    const updatedFields = [...fields];
    const temp = updatedFields[currentIndex];
    updatedFields[currentIndex] = updatedFields[newIndex];
    updatedFields[newIndex] = temp;

    // Update positions
    const reorderedFields = updatedFields.map((f, index) => ({
      id: f.id,
      position: index,
    }));

    await reorderFields.mutateAsync(reorderedFields);
  }, [fields, reorderFields]);

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
                    <TableHead className="w-[80px]">Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Opções</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Único</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={index === 0 || reorderFields.isPending}
                              onClick={() => moveField(field.id, "up")}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={index === fields.length - 1 || reorderFields.isPending}
                              onClick={() => moveField(field.id, "down")}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground ml-1">{index + 1}</span>
                        </div>
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
                        {field.is_unique ? (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">Único</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
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

            <div className="space-y-2">
              <Label htmlFor="position">Posição no Formulário</Label>
              <Select
                value={formData.position.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, position: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editingField ? (
                    // When editing, show all current positions
                    fields.map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Posição {index + 1}
                        {index === 0 && " (primeiro)"}
                        {index === fields.length - 1 && " (último)"}
                      </SelectItem>
                    ))
                  ) : (
                    // When creating, show positions including the new one
                    [...Array(fields.length + 1)].map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Posição {index + 1}
                        {index === 0 && " (primeiro)"}
                        {index === fields.length && " (último)"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define onde o campo aparece no formulário
              </p>
            </div>

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

            {(formData.field_type === "text" || formData.field_type === "number") && (
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_unique">Valor único (sem duplicados)</Label>
                  <p className="text-xs text-muted-foreground">Ex: NIF, número de cliente</p>
                </div>
                <Switch
                  id="is_unique"
                  checked={formData.is_unique}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_unique: checked })
                  }
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.name.trim() ||
                  createField.isPending ||
                  updateField.isPending ||
                  reorderFields.isPending
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
