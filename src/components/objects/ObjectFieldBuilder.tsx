import { useState } from "react";
import { useCoreObjectFields, useCreateObjectField, useUpdateObjectField, useDeleteObjectField, CoreObjectField } from "@/hooks/useCoreObjectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "currency", label: "Moeda" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "multi_select", label: "Multi-Seleção" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "boolean", label: "Sim/Não" },
  { value: "relation", label: "Relação" },
];

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
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar Campo
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={newField.name} onChange={(e) => setNewField({ ...newField, name: e.target.value })} placeholder="Ex: Email" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newField.field_type} onValueChange={(v) => setNewField({ ...newField, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(newField.field_type === "select" || newField.field_type === "multi_select") && (
              <div>
                <Label>Opções (separadas por vírgula)</Label>
                <Input value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} placeholder="Opção A, Opção B, Opção C" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={newField.is_required} onCheckedChange={(v) => setNewField({ ...newField, is_required: v })} />
              <Label>Obrigatório</Label>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={!newField.name.trim() || createField.isPending}>
              {createField.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Salvar Campo
            </Button>
          </CardContent>
        </Card>
      )}

      {(!fields || fields.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo definido. Adicione campos para estruturar seus registros.</p>
      ) : (
        <div className="space-y-1">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card hover:bg-muted/50">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <span className="text-sm font-medium flex-1">{field.name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {FIELD_TYPES.find((t) => t.value === field.field_type)?.label || field.field_type}
              </Badge>
              {field.is_required && <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>}
              {!field.is_system && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteField.mutate({ id: field.id, object_id: objectId })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
