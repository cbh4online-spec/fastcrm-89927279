import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wand2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const handleFinish = () => {
    onComplete?.(objectName.trim(), validFields);
    resetState();
    onOpenChange(false);
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
            <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
          ) : <div />}
          {step === 0 ? (
            <Button size="sm" onClick={() => setStep(1)} disabled={!objectName.trim()} className="gap-1">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} disabled={!canFinish} className="gap-1">
              <Check className="h-3.5 w-3.5" /> Create Object
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
