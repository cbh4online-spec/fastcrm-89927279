import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, Trash2, Loader2 } from "lucide-react";
import {
  countBodyVariables, toMetaTemplateName, validateMetaTemplate, type MetaCategory,
} from "../../../supabase/functions/_shared/metaTemplateRules";

type MetaTemplate = { id: string; name: string; status: string; category: string; language: string; rejected_reason?: string; components?: { type: string; text?: string }[] };

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  APPROVED: { label: "Aprovado", variant: "default" },
  PENDING: { label: "Em análise", variant: "secondary" },
  IN_APPEAL: { label: "Em recurso", variant: "secondary" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
  PAUSED: { label: "Pausado", variant: "outline" },
  DISABLED: { label: "Desativado", variant: "outline" },
};
const CATEGORY_LABEL: Record<string, string> = { UTILITY: "Utilidade", MARKETING: "Marketing", AUTHENTICATION: "Autenticação" };

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("whatsapp-meta-templates", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw Object.assign(new Error(data.error), { code: data.code });
  return data;
}

export function MetaOfficialTemplatesPanel() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["meta-templates", wid],
    enabled: !!wid,
    retry: false,
    queryFn: async () => ((await call({ action: "list", workspaceId: wid })).data?.data ?? []) as MetaTemplate[],
  });
  const del = useMutation({
    mutationFn: (name: string) => call({ action: "delete", workspaceId: wid, name }),
    onSuccess: () => { toast.success("Modelo apagado na Meta."); qc.invalidateQueries({ queryKey: ["meta-templates", wid] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const notActive = (q.error as { code?: string } | null)?.code === "META_NOT_ALLOWED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Fora das 24 h desde a última mensagem do cliente, a Meta só aceita modelos aprovados. A análise demora de minutos a 48 h. Um modelo aprovado não pode ser editado — crie um novo.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching || notActive}>
            <RefreshCw className={`h-4 w-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} />Atualizar estados
          </Button>
          <Button size="sm" onClick={() => setOpen(true)} disabled={notActive}><Plus className="h-4 w-4 mr-2" />Novo modelo Meta</Button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : q.error ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {notActive ? "Este workspace não tem a linha oficial WhatsApp ativa. Peça o add-on em Definições → Canais." : (q.error as Error).message}
        </CardContent></Card>
      ) : !q.data?.length ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Ainda não há modelos na Meta.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 divide-y">
          {q.data.map((t) => {
            const st = STATUS[t.status] ?? { label: t.status, variant: "outline" as const };
            const body = t.components?.find((c) => c.type === "BODY")?.text ?? "";
            return (
              <div key={t.id} className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <Badge variant="outline">{CATEGORY_LABEL[t.category] ?? t.category}</Badge>
                    <span className="text-xs text-muted-foreground">{t.language}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{body}</p>
                  {t.status === "REJECTED" && t.rejected_reason && t.rejected_reason !== "NONE" && (
                    <p className="text-xs text-destructive">Motivo: {t.rejected_reason}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" aria-label={`Apagar ${t.name}`} disabled={del.isPending}
                  onClick={() => { if (confirm(`Apagar o modelo "${t.name}" na Meta? Esta ação não pode ser desfeita.`)) del.mutate(t.name); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </CardContent></Card>
      )}

      {wid && <NewMetaTemplateDialog open={open} onOpenChange={setOpen} workspaceId={wid} onCreated={() => qc.invalidateQueries({ queryKey: ["meta-templates", wid] })} />}
    </div>
  );
}

function NewMetaTemplateDialog({ open, onOpenChange, workspaceId, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string; onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<MetaCategory>("UTILITY");
  const [language, setLanguage] = useState("pt_PT");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [examples, setExamples] = useState<string[]>([]);

  const name = toMetaTemplateName(label);
  const nVars = countBodyVariables(body);
  const draft = { name, category, language, header, body, footer, examples };
  const errors = useMemo(() => validateMetaTemplate(draft), [name, category, language, header, body, footer, examples]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, i) => examples[Number(i) - 1] || `{{${i}}}`);

  const create = useMutation({
    mutationFn: () => call({ action: "create", workspaceId, template: draft }),
    onSuccess: () => {
      toast.success("Modelo enviado para análise da Meta.");
      onCreated(); onOpenChange(false);
      setLabel(""); setHeader(""); setBody(""); setFooter(""); setExamples([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo modelo Meta</DialogTitle>
          <DialogDescription>Use {"{{1}}"}, {"{{2}}"}… para dados que mudam (nome, número da fatura).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="mt-name">Nome</Label>
              <Input id="mt-name" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} placeholder="Aviso de fatura" />
              {name && <p className="text-xs text-muted-foreground">Na Meta: {name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as MetaCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utilidade (avisos, faturas)</SelectItem>
                    <SelectItem value="MARKETING">Marketing (promoções)</SelectItem>
                    <SelectItem value="AUTHENTICATION">Autenticação (códigos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_PT">Português (PT)</SelectItem>
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">Inglês</SelectItem>
                    <SelectItem value="es_ES">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mt-header">Cabeçalho (opcional)</Label>
              <Input id="mt-header" value={header} maxLength={60} onChange={(e) => setHeader(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mt-body">Mensagem</Label>
              <Textarea id="mt-body" rows={6} value={body} maxLength={1024} onChange={(e) => setBody(e.target.value)}
                placeholder="Olá {{1}}, a sua fatura {{2}} já está disponível. Qualquer dúvida responda a esta mensagem." />
              <Button type="button" variant="outline" size="sm" onClick={() => setBody((b) => `${b}{{${nVars + 1}}}`)}>Inserir variável {`{{${nVars + 1}}}`}</Button>
            </div>
            {Array.from({ length: nVars }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Label htmlFor={`mt-ex-${i}`}>Exemplo para {`{{${i + 1}}}`}</Label>
                <Input id={`mt-ex-${i}`} value={examples[i] ?? ""} maxLength={200}
                  onChange={(e) => setExamples((arr) => { const c = [...arr]; c[i] = e.target.value; return c; })} />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="mt-footer">Rodapé (opcional)</Label>
              <Input id="mt-footer" value={footer} maxLength={60} onChange={(e) => setFooter(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pré-visualização</Label>
            <div className="rounded-lg bg-muted p-4">
              <div className="rounded-lg bg-card p-3 shadow-sm space-y-1 text-sm">
                {header && <p className="font-semibold">{header}</p>}
                <p className="whitespace-pre-wrap">{preview || "…"}</p>
                {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
              </div>
            </div>
            {body && errors.length > 0 && (
              <ul className="text-xs text-destructive list-disc pl-4 space-y-0.5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={errors.length > 0 || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar para aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
