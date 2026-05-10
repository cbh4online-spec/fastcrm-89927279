import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { detectVariables, renderTemplate, useUpsertWhatsAppTemplate, type WhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: WhatsAppTemplate | null;
}

const CATEGORIES = ["general", "marketing", "transactional", "support", "reminder", "onboarding"];
const LANGS = [
  { code: "pt_PT", label: "Português (PT)" },
  { code: "pt_BR", label: "Português (BR)" },
  { code: "en_US", label: "English (US)" },
  { code: "es_ES", label: "Español" },
];
const COUNTRIES = ["PT", "BR", "ES", "FR", "US", "UK"];

export function WhatsAppTemplateDialog({ open, onOpenChange, template }: Props) {
  const upsert = useUpsertWhatsAppTemplate();
  const { currentWorkspace } = useWorkspace();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("pt_PT");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [country, setCountry] = useState("PT");
  const [active, setActive] = useState(true);
  const [tags, setTags] = useState("");

  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setLanguage(template.language || "pt_PT");
      setBody(template.body);
      setCategory(template.category || "general");
      setCountry(template.country || "PT");
      setActive(template.is_active ?? true);
      setTags((template.tags || []).join(", "));
    } else {
      setName(""); setLanguage("pt_PT"); setBody("");
      setCategory("general"); setCountry("PT"); setActive(true); setTags("");
    }
    setPreviewVars({});
  }, [template, open]);

  const variables = useMemo(() => detectVariables(body), [body]);

  useEffect(() => {
    setPreviewVars((prev) => {
      const next: Record<string, string> = {};
      for (const v of variables) next[v] = prev[v] ?? "";
      return next;
    });
  }, [variables]);

  const preview = renderTemplate(body, previewVars);

  const submit = async (status: "draft" | "pending_review" | "approved") => {
    if (!name.trim() || !body.trim()) {
      toast.error("Nome e corpo são obrigatórios");
      return;
    }
    await upsert.mutateAsync({
      id: template?.id,
      name: name.trim(),
      language,
      body,
      category,
      country,
      is_active: active,
      status,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    onOpenChange(false);
  };

  const sendTest = async () => {
    if (!currentWorkspace || !testPhone.trim()) {
      toast.error("Indica um telefone para teste");
      return;
    }
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("whatsapp-pro-send", {
        body: {
          workspaceId: currentWorkspace.id,
          phone: testPhone.replace(/\D/g, ""),
          messageType: "text",
          text: preview,
        },
      });
      if (error) throw error;
      toast.success("Mensagem de teste enviada");
    } catch (e: any) {
      toast.error(e.message || "Falha no envio de teste");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? "Editar template" : "Novo template WhatsApp"}</DialogTitle>
          <DialogDescription>
            Usa <code>{"{{variavel}}"}</code> para campos dinâmicos. Detetadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="boas_vindas_pt" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>País</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGS.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Corpo da mensagem</Label>
              <Textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Olá {{nome}}, o teu pedido {{numero}} está pronto."
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {variables.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sem variáveis detetadas</span>
                ) : variables.map(v => (
                  <Badge key={v} variant="secondary">{`{{${v}}}`}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vendas, promo" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="m-0">Ativo</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Pré-visualização</Label>
              <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm whitespace-pre-wrap min-h-[140px]">
                {preview || <span className="text-muted-foreground">…</span>}
              </div>
            </div>
            {variables.length > 0 && (
              <div className="space-y-2">
                <Label>Valores de exemplo</Label>
                {variables.map(v => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-xs w-28 text-muted-foreground">{`{{${v}}}`}</span>
                    <Input
                      value={previewVars[v] || ""}
                      onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })}
                      placeholder="valor"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs">Enviar teste</Label>
              <div className="flex gap-2">
                <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="351912345678" />
                <Button size="sm" variant="outline" onClick={sendTest} disabled={testing}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={() => submit("draft")} disabled={upsert.isPending}>
            Guardar rascunho
          </Button>
          <Button variant="outline" onClick={() => submit("pending_review")} disabled={upsert.isPending}>
            Enviar p/ revisão
          </Button>
          <Button onClick={() => submit("approved")} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
