import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wand2, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface FieldDef {
  name: string;
  type: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL" },
  { value: "select", label: "Select" },
];

const TEMPLATES = [
  { name: "Project", icon: "📁", fields: [{ name: "Project Name", type: "text" }, { name: "Start Date", type: "date" }, { name: "Budget", type: "number" }, { name: "Status", type: "select" }] },
  { name: "Product", icon: "📦", fields: [{ name: "Product Name", type: "text" }, { name: "SKU", type: "text" }, { name: "Price", type: "number" }, { name: "Category", type: "select" }] },
  { name: "Ticket", icon: "🎫", fields: [{ name: "Subject", type: "text" }, { name: "Priority", type: "select" }, { name: "Due Date", type: "date" }, { name: "Assignee", type: "text" }] },
];

interface CreateObjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (objectName: string, fields: FieldDef[]) => void;
}

export function CreateObjectWizard({ open, onOpenChange, onComplete }: CreateObjectWizardProps) {
  const [step, setStep] = useState(0);
  const [objectName, setObjectName] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([{ name: "", type: "text" }]);
  const [saving, setSaving] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const resetState = () => {
    setStep(0);
    setObjectName("");
    setFields([{ name: "", type: "text" }]);
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setObjectName(template.name);
    setFields(template.fields);
    setStep(1);
  };

  const addField = () => setFields([...fields, { name: "", type: "text" }]);
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const updateField = (i: number, key: keyof FieldDef, value: string) => {
    const updated = [...fields];
    updated[i] = { ...updated[i], [key]: value };
    setFields(updated);
  };

  const validFields = fields.filter((f) => f.name.trim());
  const canFinish = objectName.trim() && validFields.length >= 1;

  const handleFinish = async () => {
    if (!currentWorkspace?.id) {
      toast.error("Nenhum workspace selecionado");
      return;
    }

    setSaving(true);
    try {
      const typeSlug = objectName.trim().toLowerCase().replace(/\s+/g, "_");

      // Insert into core_object_types
      const { data: objectType, error: objError } = await supabase
        .from("core_object_types")
        .insert({
          workspace_id: currentWorkspace.id,
          type: typeSlug,
          label: objectName.trim(),
          label_pt: objectName.trim(),
          icon: "Package",
          source_table: `custom_${typeSlug}`,
          color: "text-primary",
          description: `Custom object: ${objectName.trim()}`,
          source_module: null,
          is_active: true,
        } as any)
        .select("id")
        .single();

      if (objError) throw objError;

      // Insert fields into core_object_fields
      if (objectType && validFields.length > 0) {
        const fieldInserts = validFields.map((f) => ({
          object_type_id: objectType.id,
          workspace_id: currentWorkspace.id,
          key: f.name.toLowerCase().replace(/\s+/g, "_"),
          type: f.type,
          label: f.name,
        }));

        const { error: fieldsError } = await supabase
          .from("core_object_fields")
          .insert(fieldInserts as any);

        if (fieldsError) {
          console.error("Error inserting fields:", fieldsError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["extension-manifests"] });
      queryClient.invalidateQueries({ queryKey: ["object-counts"] });

      toast.success(`Objeto "${objectName.trim()}" criado com ${validFields.length} campos`);
      onComplete?.(objectName.trim(), validFields);
      resetState();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating object:", err);
      toast.error(err.message || "Erro ao criar objeto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {step === 0 ? "Create Custom Object" : `Configure "${objectName}"`}
          </DialogTitle>
          <DialogDescription>
            {step === 0 ? "Start from a template or create from scratch." : "Define the fields for your object."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          {[0, 1].map((s) => (
            <div key={s} className={cn("h-1 rounded-full flex-1 transition-colors", s <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Object Name</Label>
              <Input
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                placeholder="e.g. Project, Product, Ticket..."
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Or start from a template:</p>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => applyTemplate(t)}
                    className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-center"
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <p className="text-xs font-medium mt-1">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.fields.length} fields</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 py-2 max-h-64 overflow-y-auto">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={field.name}
                  onChange={(e) => updateField(i, "name", e.target.value)}
                  placeholder="Field name"
                  className="flex-1 h-8 text-sm"
                />
                <Select value={field.type} onValueChange={(v) => updateField(i, "type", v)}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fields.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeField(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1 text-xs w-full" onClick={addField}>
              <Plus className="h-3 w-3" /> Add Field
            </Button>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="gap-1" disabled={saving}>
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
          ) : <div />}
          {step === 0 ? (
            <Button size="sm" onClick={() => setStep(1)} disabled={!objectName.trim()} className="gap-1">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} disabled={!canFinish || saving} className="gap-1">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? "Creating..." : "Create Object"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
