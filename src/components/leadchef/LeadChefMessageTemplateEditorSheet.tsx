import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LEADCHEF_TEMPLATE_CATEGORIES,
  LEADCHEF_TEMPLATE_CATEGORY_LABELS,
  type LeadChefTemplateCategory,
} from "@/utils/leadchef/templates";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeadChefTemplateSectionedEditor } from "./LeadChefTemplateSectionedEditor";
import { useCreateLeadChefMessageTemplate } from "@/hooks/leadchef/useCreateLeadChefMessageTemplate";
import { useUpdateLeadChefMessageTemplate } from "@/hooks/leadchef/useUpdateLeadChefMessageTemplate";
import { LeadChefTemplateVariableHelper } from "./LeadChefTemplateVariableHelper";
import type { LeadChefMessageTemplate } from "@/types/leadchefTemplates";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template?: LeadChefMessageTemplate | null;
}

export function LeadChefMessageTemplateEditorSheet({ open, onOpenChange, template }: Props) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<LeadChefTemplateCategory>(
    (template?.category as LeadChefTemplateCategory) ?? "first_contact"
  );
  const [body, setBody] = useState(template?.body ?? "");
  const [active, setActive] = useState(template?.is_active ?? true);

  const create = useCreateLeadChefMessageTemplate();
  const update = useUpdateLeadChefMessageTemplate();

  // Reset on open
  // (sheet remounts on open if key changes; aqui simples)
  if (open && template && template.id !== (window as any).__lcLastTplId) {
    (window as any).__lcLastTplId = template.id;
    setName(template.name);
    setCategory(template.category as LeadChefTemplateCategory);
    setBody(template.body);
    setActive(template.is_active);
  }
  if (open && !template && (window as any).__lcLastTplId !== "__new__") {
    (window as any).__lcLastTplId = "__new__";
    setName("");
    setCategory("first_contact");
    setBody("");
    setActive(true);
  }

  const submit = async () => {
    if (template?.id) {
      await update.mutateAsync({ id: template.id, name, category, body, is_active: active });
    } else {
      await create.mutateAsync({ name, category, body, is_active: active });
    }
    (window as any).__lcLastTplId = null;
    onOpenChange(false);
  };

  const insertVar = (k: string) => setBody((b) => `${b}{{${k}}}`);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{template ? "Editar template" : "Novo template"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Primeiro contacto" />
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as LeadChefTemplateCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEADCHEF_TEMPLATE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{LEADCHEF_TEMPLATE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Olá {{firstName}}, …"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Usa variáveis como {"{{firstName}}"} ou {"{{agentName}}"}.
            </p>
          </div>

          <LeadChefTemplateVariableHelper onInsert={insertVar} />

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Ativo</p>
              <p className="text-xs text-slate-500">Templates inativos não aparecem no envio rápido.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={submit}
              disabled={create.isPending || update.isPending}
            >
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
