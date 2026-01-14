import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Calendar as CalendarIcon, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  boolean: "Sim/Não",
  select: "Seleção",
};

// Native fields structure for each entity type
interface NativeField {
  id: string;
  name: string;
  type: "text" | "email" | "phone" | "select" | "textarea" | "number" | "date";
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

const NATIVE_FIELDS: Record<CustomFieldEntityType, NativeField[]> = {
  contact: [
    { id: "name", name: "Nome", type: "text", required: true, placeholder: "Nome completo" },
    { id: "email", name: "Email", type: "email", placeholder: "email@exemplo.com" },
    { id: "phone", name: "Telefone", type: "phone", placeholder: "+351 000 000 000" },
    { id: "company", name: "Empresa", type: "text", placeholder: "Nome da empresa" },
    { id: "job_title", name: "Cargo", type: "text", placeholder: "Cargo" },
    { id: "tags", name: "Tags", type: "text", placeholder: "tag1, tag2" },
    { id: "notes", name: "Notas", type: "textarea", placeholder: "Notas adicionais..." },
  ],
  company: [
    { id: "name", name: "Nome", type: "text", required: true, placeholder: "Nome da empresa" },
    { id: "industry", name: "Indústria", type: "text", placeholder: "Setor de atividade" },
    { id: "size", name: "Tamanho", type: "select", options: ["1-10", "11-50", "51-200", "201-500", "500+"] },
    { id: "website", name: "Website", type: "text", placeholder: "https://..." },
    { id: "email", name: "Email", type: "email", placeholder: "email@empresa.com" },
    { id: "phone", name: "Telefone", type: "phone", placeholder: "+351 000 000 000" },
    { id: "address", name: "Morada", type: "textarea", placeholder: "Morada completa" },
    { id: "tags", name: "Tags", type: "text", placeholder: "tag1, tag2" },
    { id: "notes", name: "Notas", type: "textarea", placeholder: "Notas adicionais..." },
  ],
  lead: [
    { id: "name", name: "Nome", type: "text", required: true, placeholder: "Nome do lead" },
    { id: "email", name: "Email", type: "email", placeholder: "email@exemplo.com" },
    { id: "phone", name: "Telefone", type: "phone", placeholder: "+351 000 000 000" },
    { id: "source", name: "Origem", type: "select", options: ["Website", "Referência", "LinkedIn", "Evento", "Outro"] },
    { id: "status", name: "Estado", type: "select", options: ["new", "contacted", "qualified", "unqualified"] },
  ],
  opportunity: [
    { id: "title", name: "Nome", type: "text", required: true, placeholder: "Nome da oportunidade" },
    { id: "value", name: "Valor (€)", type: "number", placeholder: "0" },
    { id: "stage_id", name: "Fase", type: "select", placeholder: "Selecionar fase" },
    { id: "lead_id", name: "Lead Associado", type: "select", placeholder: "Selecionar lead" },
    { id: "expected_close_date", name: "Data Prevista", type: "date" },
    { id: "notes", name: "Notas", type: "textarea", placeholder: "Notas adicionais..." },
  ],
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
  const [showPreview, setShowPreview] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: fields = [], isLoading } = useCustomFields(entityType);
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();
  const reorderFields = useReorderCustomFields();

  const nativeFields = NATIVE_FIELDS[entityType];
  const totalFieldsCount = nativeFields.length;

  const handleOpenCreate = () => {
    setEditingField(null);
    setFormData({
      ...initialFormData,
      position: fields.length,
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
      const positionChanged = formData.position !== editingField.position;
      
      await updateField.mutateAsync({
        id: editingField.id,
        name: formData.name.trim(),
        options,
        required: formData.required,
        is_unique: formData.is_unique,
        position: formData.position,
      });

      if (positionChanged) {
        const updatedFields = [...fields]
          .filter(f => f.id !== editingField.id)
          .sort((a, b) => a.position - b.position);
        
        updatedFields.splice(formData.position, 0, { ...editingField, position: formData.position } as CustomField);
        
        const reorderedFields = updatedFields.map((f, index) => ({
          id: f.id,
          position: index,
        }));
        
        await reorderFields.mutateAsync(reorderedFields);
      }
    } else {
      const newPosition = formData.position;
      
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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;
    
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (dragIndex === null || dragIndex === dropIndex) return;

    // Reorder fields
    const updatedFields = [...fields];
    const [draggedField] = updatedFields.splice(dragIndex, 1);
    updatedFields.splice(dropIndex, 0, draggedField);

    const reorderedFields = updatedFields.map((f, index) => ({
      id: f.id,
      position: index,
    }));

    await reorderFields.mutateAsync(reorderedFields);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getEntityTypeLabel = (type: CustomFieldEntityType) => {
    switch (type) {
      case "lead": return "leads";
      case "opportunity": return "oportunidades";
      case "contact": return "contactos";
      case "company": return "empresas";
    }
  };

  // Get position label showing where the field will appear
  const getPositionLabel = (position: number): string => {
    if (position === 0) {
      return `Após "${nativeFields[0]?.name || 'Nome'}" (primeiro campo personalizado)`;
    }
    
    const customFieldsBeforePosition = fields.filter(f => f.position < position);
    if (customFieldsBeforePosition.length > 0) {
      const lastCustomField = customFieldsBeforePosition[customFieldsBeforePosition.length - 1];
      return `Após "${lastCustomField.name}" (personalizado)`;
    }
    
    return `Posição ${position + 1}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campos Personalizados</h2>
          <p className="text-sm text-muted-foreground">
            Crie e organize campos personalizados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? "Ocultar" : "Pré-visualizar"}
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Campo
          </Button>
        </div>
      </div>

      <Tabs value={entityType} onValueChange={(v) => setEntityType(v as CustomFieldEntityType)}>
        <TabsList>
          <TabsTrigger value="lead">Leads</TabsTrigger>
          <TabsTrigger value="opportunity">Oportunidades</TabsTrigger>
          <TabsTrigger value="contact">Contactos</TabsTrigger>
          <TabsTrigger value="company">Empresas</TabsTrigger>
        </TabsList>

        <TabsContent value={entityType} className="mt-4">
          <div className={cn("grid gap-6", showPreview && "lg:grid-cols-2")}>
            {/* Fields List */}
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">
                    Ainda não tem campos personalizados para {getEntityTypeLabel(entityType)}
                  </p>
                  <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeiro campo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Arraste os campos para reordenar ou use o menu de ações
                  </p>
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 p-3 bg-background border rounded-lg cursor-grab active:cursor-grabbing transition-all",
                        draggedIndex === index && "opacity-50 scale-95",
                        dragOverIndex === index && "border-primary border-2 bg-primary/5",
                        reorderFields.isPending && "pointer-events-none opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="w-4 h-4" />
                        <Badge variant="outline" className="text-xs font-mono w-6 justify-center">
                          {index + 1}
                        </Badge>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{field.name}</span>
                          {field.required && (
                            <span className="text-destructive text-xs">*</span>
                          )}
                          {field.is_unique && (
                            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
                              Único
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {FIELD_TYPE_LABELS[field.field_type]}
                          </Badge>
                          {field.field_type === "select" && field.options?.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {field.options.length} opções
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(field)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteFieldId(field.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Full Form Preview Panel */}
            {showPreview && (
              <Card className="animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Pré-visualização do Formulário
                    <Badge variant="outline" className="font-normal">
                      {getEntityTypeLabel(entityType).charAt(0).toUpperCase() + getEntityTypeLabel(entityType).slice(1)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Visualização completa do formulário com campos nativos e personalizados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FullFormPreview
                    entityType={entityType}
                    nativeFields={nativeFields}
                    customFields={fields}
                  />
                </CardContent>
              </Card>
            )}
          </div>
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
                : `Adicione um novo campo para ${getEntityTypeLabel(entityType)}.`}
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
                    fields.map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Posição {index + 1}
                        {index === 0 && " (primeiro)"}
                        {index === fields.length - 1 && " (último)"}
                      </SelectItem>
                    ))
                  ) : (
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
                Os campos personalizados aparecem após os campos nativos do formulário
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

// Full form preview component that shows native + custom fields
interface FullFormPreviewProps {
  entityType: CustomFieldEntityType;
  nativeFields: NativeField[];
  customFields: CustomField[];
}

function FullFormPreview({ entityType, nativeFields, customFields }: FullFormPreviewProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20 max-h-[500px] overflow-y-auto">
      {/* Native fields */}
      {nativeFields.map((field, index) => (
        <div key={field.id}>
          <NativeFieldPreview field={field} />
          
          {/* Insert custom fields after first native field (Nome) */}
          {index === 0 && customFields.length > 0 && (
            <div className="mt-4 space-y-4">
              {customFields.map((customField) => (
                <div 
                  key={customField.id}
                  className="relative rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3"
                >
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 left-3 text-xs bg-primary text-primary-foreground"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Personalizado
                  </Badge>
                  <div className="mt-1">
                    <CustomFieldPreview field={customField} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Empty state for custom fields */}
      {customFields.length === 0 && (
        <div className="mt-4 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Os campos personalizados aparecerão aqui após o campo "Nome"
          </p>
        </div>
      )}
    </div>
  );
}

// Native field preview component
function NativeFieldPreview({ field }: { field: NativeField }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm flex items-center gap-2">
        {field.name}
        {field.required && <span className="text-destructive">*</span>}
        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
          Nativo
        </Badge>
      </Label>
      
      {(field.type === "text" || field.type === "email" || field.type === "phone") && (
        <Input 
          placeholder={field.placeholder} 
          disabled 
          className="bg-background"
        />
      )}
      
      {field.type === "number" && (
        <Input 
          type="number" 
          placeholder={field.placeholder || "0"} 
          disabled 
          className="bg-background"
        />
      )}
      
      {field.type === "date" && (
        <Button 
          variant="outline" 
          disabled 
          className="w-full justify-start text-left font-normal text-muted-foreground bg-background"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Selecionar data
        </Button>
      )}
      
      {field.type === "select" && (
        <Select disabled>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder={field.placeholder || `Selecionar ${field.name.toLowerCase()}`} />
          </SelectTrigger>
        </Select>
      )}
      
      {field.type === "textarea" && (
        <Textarea 
          placeholder={field.placeholder} 
          disabled 
          className="bg-background resize-none min-h-[60px]"
        />
      )}
    </div>
  );
}

// Custom field preview component
function CustomFieldPreview({ field }: { field: CustomField }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {field.name}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {field.field_type === "text" && (
        <Input 
          placeholder={`Introduza ${field.name.toLowerCase()}`} 
          disabled 
          className="bg-background"
        />
      )}
      
      {field.field_type === "number" && (
        <Input 
          type="number" 
          placeholder="0" 
          disabled 
          className="bg-background"
        />
      )}
      
      {field.field_type === "date" && (
        <Button 
          variant="outline" 
          disabled 
          className="w-full justify-start text-left font-normal text-muted-foreground bg-background"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Selecionar data
        </Button>
      )}
      
      {field.field_type === "boolean" && (
        <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
          <span className="text-sm text-muted-foreground">Sim / Não</span>
          <Switch disabled />
        </div>
      )}
      
      {field.field_type === "select" && (
        <Select disabled>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder={`Selecionar ${field.name.toLowerCase()}`} />
          </SelectTrigger>
        </Select>
      )}
      
      {field.is_unique && (
        <p className="text-xs text-amber-600">Campo único (sem duplicados)</p>
      )}
    </div>
  );
}
