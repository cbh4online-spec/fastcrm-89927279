import { useState } from "react";
import { useCoreObjectFields, useCreateObjectField, useUpdateObjectField, useDeleteObjectField, CoreObjectField } from "@/hooks/useCoreObjectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Type, Hash, Calendar, Mail, Globe, ToggleLeft, Link2, ListFilter, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "number", label: "Número", icon: Hash },
  { value: "currency", label: "Moeda", icon: DollarSign },
  { value: "date", label: "Data", icon: Calendar },
  { value: "select", label: "Seleção", icon: ListFilter },
  { value: "multi_select", label: "Multi-Seleção", icon: ListFilter },
  { value: "email", label: "Email", icon: Mail },
  { value: "url", label: "URL", icon: Globe },
  { value: "boolean", label: "Sim/Não", icon: ToggleLeft },
  { value: "relation", label: "Relação", icon: Link2 },
];

function getFieldIcon(fieldType: string) {
  const found = FIELD_TYPES.find((t) => t.value === fieldType);
  return found?.icon || Type;
}

interface Props {
  objectId: string;
}

export function ObjectFieldBuilder({ objectId }: Props) {
  const { data: fields, isLoading } = useCoreObjectFields(objectId);
  const createField = useCreateObjectField();
  const updateField = useUpdateObjectField();
  const deleteField = useDeleteObjectField();

  const [showAdd, setShowAdd] = useState(false);
  const [newField, setNewField] = useState({ name: "", slug: "", field_type: "text", is_required: false, options: "" });

  const handleAdd = () => {
    if (!newField.name.trim()) return;
    const slug = newField.slug || newField.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const opts = (newField.field_type === "select" || newField.field_type === "multi_select") && newField.options
      ? { options: newField.options.split(",").map((o) => o.trim()).filter(Boolean) }
      : undefined;
    createField.mutate(
      { object_id: objectId, name: newField.name, slug, field_type: newField.field_type, is_required: newField.is_required, options: opts, sort_order: (fields?.length || 0) },
      { onSuccess: () => { setShowAdd(false); setNewField({ name: "", slug: "", field_type: "text", is_required: false, options: "" }); } }
    );
  };

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Campos</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      {/* Inline add row */}
      {showAdd && (
        <div className="flex items-end gap-2 p-3 rounded-lg bg-muted/30 border border-border/30 animate-fade-in">
          <div className="flex-1">
            <Label className="text-xs">Nome</Label>
            <Input value={newField.name} onChange={(e) => setNewField({ ...newField, name: e.target.value })} placeholder="Ex: Email" className="h-8 text-xs mt-1" />
          </div>
          <div className="w-36">
            <Label className="text-xs">Tipo</Label>
            <Select value={newField.field_type} onValueChange={(v) => setNewField({ ...newField, field_type: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => {
                  const IC = t.icon;
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-1.5"><IC className="h-3 w-3 text-muted-foreground" />{t.label}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {(newField.field_type === "select" || newField.field_type === "multi_select") && (
            <div className="w-48">
              <Label className="text-xs">Opções</Label>
              <Input value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} placeholder="A, B, C" className="h-8 text-xs mt-1" />
            </div>
          )}
          <div className="flex items-center gap-1.5 pb-0.5">
            <Switch checked={newField.is_required} onCheckedChange={(v) => setNewField({ ...newField, is_required: v })} />
            <span className="text-xs text-muted-foreground">Obrig.</span>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!newField.name.trim() || createField.isPending}>
            {createField.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAdd(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {(!fields || fields.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo definido. Adicione campos para estruturar seus registros.</p>
      ) : (
        <div className="divide-y divide-border/30">
          {fields.map((field) => {
            const FieldIcon = getFieldIcon(field.field_type);
            return (
              <div key={field.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors duration-150 group">
                <FieldIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1">{field.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {FIELD_TYPES.find((t) => t.value === field.field_type)?.label || field.field_type}
                </Badge>
                {field.is_required && <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>}
                {!field.is_system && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity duration-150" onClick={() => deleteField.mutate({ id: field.id, object_id: objectId })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
