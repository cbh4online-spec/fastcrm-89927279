import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { callMetaTemplates, type MetaTemplateRow, type TemplateVar } from "./api";
import { countBodyVariables, CRM_FIELDS } from "../../../../supabase/functions/_shared/metaTemplateRules";

type Props = {
  open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string; template: MetaTemplateRow | null;
  variables: TemplateVar[]; defaultPhone?: string; contactId?: string | null; test?: boolean;
};

export function SendTemplateDialog({ open, onOpenChange, workspaceId, template, variables, defaultPhone = "", contactId = null, test = false }: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [values, setValues] = useState<Record<string, string>>({});
  const n = template ? countBodyVariables(template.definition?.body ?? "") : 0;
  const media = template && ["IMAGE", "VIDEO", "DOCUMENT"].includes(template.definition?.headerType ?? "");
  const send = useMutation({
    mutationFn: () => callMetaTemplates({ action: "send", workspaceId, templateId: template!.id, phone, contactId, values, test }),
    onSuccess: (r: any) => { toast.success(r.note ?? "Aceite pela Meta."); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{test ? "Testar modelo" : "Enviar modelo"} «{template.internal_name}»</DialogTitle>
          <DialogDescription>
            {test ? "Envie para o seu próprio número para ver como chega." : "Os campos ligados ao CRM são preenchidos com os dados reais do contacto."}
            {template.category === "MARKETING" && " Modelos de marketing exigem consentimento válido."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="st-phone">Número de destino</Label>
            <Input id="st-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351912345678" maxLength={30} />
          </div>
          {Array.from({ length: n }).map((_, i) => {
            const v = variables.find((x) => x.var_index === i + 1);
            const field = CRM_FIELDS.find((f) => f.value === v?.crm_field);
            const auto = contactId && v?.crm_field && v.crm_field !== "manual";
            return (
              <div key={i} className="space-y-1">
                <Label htmlFor={`st-v-${i}`}>{`{{${i + 1}}}`}{field ? ` · ${field.label}` : ""}</Label>
                <Input id={`st-v-${i}`} maxLength={500} value={values[String(i + 1)] ?? ""}
                  placeholder={auto ? "Preenchido automaticamente do contacto" : "Valor para este envio"}
                  onChange={(e) => setValues((s) => ({ ...s, [String(i + 1)]: e.target.value }))} />
              </div>
            );
          })}
          {media && (
            <div className="space-y-1">
              <Label htmlFor="st-media">Link https do ficheiro do cabeçalho</Label>
              <Input id="st-media" value={values.header_link ?? ""} onChange={(e) => setValues((s) => ({ ...s, header_link: e.target.value }))} placeholder="https://…" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending || phone.trim().length < 6}>
            {send.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
