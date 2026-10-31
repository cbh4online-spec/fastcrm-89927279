import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { TemplatePreview } from "./TemplatePreview";
import { callMetaTemplates, MetaTplError, STATUS_LABEL, LOCKED_STATUSES, type MetaTemplateRow, type TemplateVar, type ButtonAction } from "./api";
import {
  countBodyVariables, toMetaTemplateName, validateMetaTemplateFields, contentWarnings, META_LANGUAGES, MEDIA_RULES, CRM_FIELDS,
  type MetaCategory, type MetaButton, type HeaderType, type FieldErrors, type MetaTemplateDraft,
} from "../../../../supabase/functions/_shared/metaTemplateRules";

const ACTION_TYPES = [
  { value: "update_status", label: "Atualizar estado comercial" },
  { value: "add_tag", label: "Adicionar etiqueta" },
  { value: "create_opportunity", label: "Criar oportunidade" },
  { value: "assign_rep", label: "Atribuir comercial" },
  { value: "create_task", label: "Criar tarefa de acompanhamento" },
  { value: "remove_sequence", label: "Retirar da sequência" },
  { value: "log_interaction", label: "Registar interação" },
  { value: "opt_out", label: "Cancelar comunicações (opt-out explícito)" },
  { value: "run_workflow", label: "Executar workflow" },
];
const NONE = "__none";

type Props = {
  open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string; phone: string | null;
  template: MetaTemplateRow | null; variables: TemplateVar[]; buttonActions: ButtonAction[]; onSaved: () => void;
};

const fileToBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(f);
});

export function TemplateEditorDialog({ open, onOpenChange, workspaceId, phone, template, variables, buttonActions, onSaved }: Props) {
  const locked = !!template && LOCKED_STATUSES.has(template.status);
  const [internalName, setInternalName] = useState("");
  const [techName, setTechName] = useState(""); const [techEdited, setTechEdited] = useState(false);
  const [category, setCategory] = useState<MetaCategory>("UTILITY");
  const [language, setLanguage] = useState("pt_PT");
  const [description, setDescription] = useState(""); const [tags, setTags] = useState("");
  const [headerType, setHeaderType] = useState<HeaderType>("NONE"); const [header, setHeader] = useState("");
  const [headerHandle, setHeaderHandle] = useState(""); const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [body, setBody] = useState(""); const [footer, setFooter] = useState("");
  const [examples, setExamples] = useState<string[]>([]); const [varFields, setVarFields] = useState<Record<number, string>>({});
  const [buttons, setButtons] = useState<MetaButton[]>([]);
  const [btnActions, setBtnActions] = useState<Record<string, { type: string; value: string }>>({});
  const [secRec, setSecRec] = useState(true); const [expiry, setExpiry] = useState("10"); const [copyText, setCopyText] = useState("Copiar código");
  const [auto, setAuto] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const d = template?.definition;
    setCurrentId(template?.id ?? null);
    setInternalName(template?.internal_name ?? ""); setTechName(template?.meta_name ?? ""); setTechEdited(!!template);
    setCategory((template?.category as MetaCategory) ?? "UTILITY"); setLanguage(template?.language ?? "pt_PT");
    setDescription(template?.description ?? ""); setTags((template?.tags ?? []).join(", "));
    setHeaderType(d?.headerType ?? (d?.header ? "TEXT" : "NONE")); setHeader(d?.header ?? ""); setHeaderHandle(d?.headerHandle ?? ""); setMediaUrl(null);
    setBody(d?.body ?? ""); setFooter(d?.footer ?? ""); setExamples(d?.examples ?? []);
    setVarFields(Object.fromEntries(variables.filter((v) => v.template_id === template?.id).map((v) => [v.var_index, v.crm_field ?? "manual"])));
    setButtons(d?.buttons ?? []);
    setBtnActions(Object.fromEntries(buttonActions.filter((a) => a.template_id === template?.id).map((a) => [a.button_key, { type: a.action_type, value: String((a.config as any)?.value ?? "") }])));
    setSecRec(d?.addSecurityRecommendation ?? true); setExpiry(String(d?.codeExpirationMinutes ?? 10)); setCopyText(d?.copyCodeText ?? "Copiar código");
    setAuto(Object.fromEntries(Object.entries(template?.automations ?? {}).map(([k, v]) => [k, String(v ?? "")])));
    setServerErrors({});
  }, [open, template?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!techEdited) setTechName(toMetaTemplateName(internalName)); }, [internalName, techEdited]);

  const opts = useQuery({
    queryKey: ["meta-tpl-automation-options", workspaceId], enabled: open,
    queryFn: async () => {
      const [p, s, r, c, w] = await Promise.all([
        supabase.from("pipelines").select("id,name").eq("workspace_id", workspaceId).order("name").limit(100),
        supabase.from("pipeline_stages").select("id,name,pipeline_id").eq("workspace_id", workspaceId).limit(500),
        supabase.from("sales_reps").select("id,name").eq("workspace_id", workspaceId).eq("is_active", true).order("name").limit(200),
        supabase.from("campaigns").select("id,name").eq("workspace_id", workspaceId).order("name").limit(200),
        supabase.from("workflow_definitions").select("id,name").eq("workspace_id", workspaceId).eq("is_active", true).order("name").limit(200),
      ]);
      return { pipelines: p.data ?? [], stages: s.data ?? [], reps: r.data ?? [], campaigns: c.data ?? [], workflows: w.data ?? [] };
    },
  });

  const nVars = countBodyVariables(body);
  const draft: MetaTemplateDraft = {
    name: techName, category, language, headerType, header: headerType === "TEXT" ? header : undefined,
    headerHandle: headerHandle || undefined, body: category === "AUTHENTICATION" ? "" : body, footer: footer || undefined,
    examples: examples.slice(0, nVars), buttons: category === "AUTHENTICATION" ? [] : buttons,
    addSecurityRecommendation: secRec, codeExpirationMinutes: expiry ? Number(expiry) : undefined, copyCodeText: copyText,
  };
  const localErrors = useMemo(() => validateMetaTemplateFields(draft), [JSON.stringify(draft)]); // eslint-disable-line react-hooks/exhaustive-deps
  const warnings = useMemo(() => contentWarnings(draft), [JSON.stringify(draft)]); // eslint-disable-line react-hooks/exhaustive-deps
  const errs = (k: keyof FieldErrors) => [...(localErrors[k] ?? []), ...(serverErrors[k] ?? [])];

  const meta = () => ({
    internalName: internalName.trim() || techName, description: description || null,
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
    variables: Array.from({ length: nVars }, (_, i) => ({ index: i + 1, crmField: varFields[i + 1] ?? "manual" })),
    buttonActions: Object.entries(btnActions).filter(([k, a]) => a.type && buttons.some((b) => b.type === "QUICK_REPLY" && b.text === k))
      .map(([k, a]) => ({ buttonKey: k, actionType: a.type, config: { value: a.value, ...(a.type === "run_workflow" ? { workflow_id: a.value } : {}) } })),
    automations: Object.fromEntries(Object.entries(auto).filter(([, v]) => v && v !== NONE)),
  });

  const save = useMutation({
    mutationFn: async () => {
      const r = await callMetaTemplates({ action: "save_draft", workspaceId, templateId: currentId, template: draft, meta: meta() });
      setCurrentId(r.template.id); return r;
    },
    onSuccess: () => { toast.success("Rascunho guardado."); onSaved(); },
    onError: (e: Error) => { if (e instanceof MetaTplError && e.fieldErrors) setServerErrors(e.fieldErrors); toast.error(e.message); },
  });
  const validate = useMutation({
    mutationFn: () => callMetaTemplates({ action: "validate", workspaceId, templateId: currentId, template: draft }),
    onSuccess: (r: any) => { setServerErrors(r.fieldErrors ?? {}); r.valid ? toast.success("Modelo válido. Pode enviar para aprovação.") : toast.error("Há erros a corrigir — veja junto aos campos."); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = useMutation({
    mutationFn: async () => {
      const s = await callMetaTemplates({ action: "save_draft", workspaceId, templateId: currentId, template: draft, meta: meta() });
      setCurrentId(s.template.id);
      return callMetaTemplates({ action: "submit", workspaceId, templateId: s.template.id });
    },
    onSuccess: (r: any) => { toast.success(`Enviado para a Meta. Estado: ${STATUS_LABEL[r.template?.status]?.label ?? r.template?.status}.`); onSaved(); onOpenChange(false); },
    onError: (e: Error) => { if (e instanceof MetaTplError && e.fieldErrors) setServerErrors(e.fieldErrors); toast.error(e.message); onSaved(); },
  });
  const upload = useMutation({
    mutationFn: async (f: File) => {
      if (headerType === "NONE" || headerType === "TEXT") throw new Error("Escolha primeiro o tipo de cabeçalho.");
      const rule = MEDIA_RULES[headerType];
      if (!rule.mimes.includes(f.type)) throw new Error(`Formato não suportado. Use ${rule.label}.`);
      if (f.size > rule.maxBytes) throw new Error(`Ficheiro demasiado grande. Use ${rule.label}.`);
      if (f.size > 20 * 1024 * 1024) throw new Error("Para aprovação use um ficheiro de exemplo até 20 MB.");
      const r = await callMetaTemplates({ action: "upload_media", workspaceId, fileBase64: await fileToBase64(f), mimeType: f.type, fileName: f.name.slice(0, 200) });
      if (headerType === "IMAGE") setMediaUrl(URL.createObjectURL(f));
      return r.handle as string;
    },
    onSuccess: (h) => { setHeaderHandle(h); toast.success("Ficheiro carregado na Meta."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const insertVar = () => {
    const el = bodyRef.current; const tag = `{{${nVars + 1}}}`;
    if (!el) return setBody((b) => b + tag);
    const s = el.selectionStart ?? body.length, e = el.selectionEnd ?? s;
    setBody(body.slice(0, s) + tag + body.slice(e));
  };
  const wrap = (m: string) => {
    const el = bodyRef.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd; if (s === e) return;
    setBody(body.slice(0, s) + m + body.slice(s, e) + m + body.slice(e));
  };
  const moveBtn = (i: number, d: -1 | 1) => setButtons((b) => { const c = [...b]; const j = i + d; if (j < 0 || j >= c.length) return c; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const busy = save.isPending || submit.isPending || validate.isPending;
  const hasErrors = Object.keys(localErrors).length > 0;
  const ErrList = ({ k }: { k: keyof FieldErrors }) => <>{errs(k).map((m, i) => <p key={i} role="alert" className="text-xs text-destructive">{m}</p>)}</>;
  const sel = (key: string, label: string, items: { id: string; name: string }[]) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={auto[key] || NONE} onValueChange={(v) => setAuto((a) => ({ ...a, [key]: v }))} disabled={locked}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value={NONE}>Nenhum</SelectItem>{items.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{template ? "Modelo Meta" : "Novo modelo Meta"}
            {template && <Badge variant={STATUS_LABEL[template.status]?.variant ?? "outline"}>{STATUS_LABEL[template.status]?.label ?? template.status}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {locked ? "Este modelo já foi submetido ou aprovado e está protegido. Para alterar, duplique-o — a cópia passa por nova aprovação." : "Campos com * são obrigatórios. Guarde como rascunho a qualquer momento."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <fieldset disabled={locked} className="min-w-0">
            <Accordion type="multiple" defaultValue={locked ? ["a", "b", "c", "d", "e"] : ["a", "b"]} className="w-full">
              <AccordionItem value="a">
                <AccordionTrigger>A · Identificação</AccordionTrigger>
                <AccordionContent className="space-y-3 px-1">
                  <div className="space-y-1"><Label>Conta WhatsApp Business</Label><Input value={phone ? `Linha oficial ${phone}` : "Linha oficial ligada"} readOnly /></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label htmlFor="mt-int">Nome interno *</Label><Input id="mt-int" value={internalName} maxLength={160} onChange={(e) => setInternalName(e.target.value)} placeholder="Aviso de fatura" /></div>
                    <div className="space-y-1">
                      <Label htmlFor="mt-tech">Nome técnico Meta *</Label>
                      <Input id="mt-tech" value={techName} maxLength={512} onChange={(e) => { setTechEdited(true); setTechName(e.target.value); }} aria-invalid={errs("name").length > 0} />
                      <p className="text-xs text-muted-foreground">Só minúsculas, números e _. Gerado a partir do nome interno.</p><ErrList k="name" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label>Categoria *</Label>
                      <Select value={category} onValueChange={(v) => setCategory(v as MetaCategory)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTILITY">Utilidade (avisos, faturas, encomendas)</SelectItem>
                          <SelectItem value="MARKETING">Marketing (promoções, novidades)</SelectItem>
                          <SelectItem value="AUTHENTICATION">Autenticação (códigos)</SelectItem>
                        </SelectContent>
                      </Select><ErrList k="category" />
                    </div>
                    <div className="space-y-1"><Label>Idioma *</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{META_LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select><ErrList k="language" />
                    </div>
                  </div>
                  <div className="space-y-1"><Label htmlFor="mt-desc">Descrição interna</Label><Textarea id="mt-desc" rows={2} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="mt-tags">Etiquetas internas</Label><Input id="mt-tags" value={tags} maxLength={400} onChange={(e) => setTags(e.target.value)} placeholder="cobranças, faturas" /><p className="text-xs text-muted-foreground">Separe por vírgulas.</p></div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="b">
                <AccordionTrigger>B · Conteúdo da mensagem</AccordionTrigger>
                <AccordionContent className="space-y-3 px-1">
                  {category === "AUTHENTICATION" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">A Meta define o texto dos modelos de autenticação: «&lt;código&gt; é o seu código de verificação», com botão para copiar.</p>
                      <div className="flex items-center gap-2"><Switch id="mt-sec" checked={secRec} onCheckedChange={setSecRec} /><Label htmlFor="mt-sec">Acrescentar aviso «não partilhe o código»</Label></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1"><Label htmlFor="mt-exp">Validade do código (minutos)</Label><Input id="mt-exp" type="number" min={1} max={90} value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
                        <div className="space-y-1"><Label htmlFor="mt-copy">Texto do botão</Label><Input id="mt-copy" maxLength={25} value={copyText} onChange={(e) => setCopyText(e.target.value)} /></div>
                      </div>
                      <ErrList k="body" /><ErrList k="buttons" />
                    </div>
                  ) : (<>
                    <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                      <div className="space-y-1"><Label>Cabeçalho</Label>
                        <Select value={headerType} onValueChange={(v) => { setHeaderType(v as HeaderType); setHeaderHandle(""); setMediaUrl(null); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Sem cabeçalho</SelectItem><SelectItem value="TEXT">Texto</SelectItem>
                            <SelectItem value="IMAGE">Imagem</SelectItem><SelectItem value="VIDEO">Vídeo</SelectItem><SelectItem value="DOCUMENT">Documento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {headerType === "TEXT" && (
                        <div className="space-y-1"><Label htmlFor="mt-h">Texto do cabeçalho *</Label><Input id="mt-h" maxLength={60} value={header} onChange={(e) => setHeader(e.target.value)} /><p className="text-xs text-muted-foreground">{header.length}/60</p></div>
                      )}
                      {headerType !== "NONE" && headerType !== "TEXT" && (
                        <div className="space-y-1">
                          <Label htmlFor="mt-file">Ficheiro de exemplo * <span className="font-normal text-muted-foreground">({MEDIA_RULES[headerType].label})</span></Label>
                          <Input id="mt-file" type="file" accept={MEDIA_RULES[headerType].mimes.join(",")} disabled={upload.isPending || locked}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
                          {upload.isPending && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />A carregar na Meta…</p>}
                          {headerHandle && <p className="text-xs text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Ficheiro pronto para aprovação.</p>}
                          <p className="text-xs text-muted-foreground">No envio real indica-se o ficheiro a usar.</p>
                        </div>
                      )}
                    </div>
                    <ErrList k="header" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between"><Label htmlFor="mt-body">Mensagem *</Label><span className="text-xs text-muted-foreground">{body.length}/1024</span></div>
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" size="sm" variant="outline" onClick={() => wrap("*")} aria-label="Negrito"><b>N</b></Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => wrap("_")} aria-label="Itálico"><i>I</i></Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => wrap("~")} aria-label="Riscado"><s>R</s></Button>
                        <Button type="button" size="sm" variant="outline" onClick={insertVar}>Inserir variável {`{{${nVars + 1}}}`}</Button>
                      </div>
                      <Textarea ref={bodyRef} id="mt-body" rows={6} value={body} maxLength={1024} onChange={(e) => setBody(e.target.value)} aria-invalid={errs("body").length > 0}
                        placeholder="Olá {{1}}, a sua fatura {{2}} já está disponível. Qualquer dúvida responda a esta mensagem." />
                      <ErrList k="body" />
                    </div>
                    {nVars > 0 && (
                      <div className="space-y-2 rounded-md border p-3">
                        <p className="text-sm font-medium">Variáveis</p>
                        {Array.from({ length: nVars }).map((_, i) => (
                          <div key={i} className="grid gap-2 sm:grid-cols-[60px_1fr_1fr] items-end">
                            <span className="text-sm font-mono pb-2">{`{{${i + 1}}}`}</span>
                            <div className="space-y-1"><Label htmlFor={`mt-ex-${i}`} className="text-xs">Exemplo (aprovação) *</Label>
                              <Input id={`mt-ex-${i}`} maxLength={200} value={examples[i] ?? ""} onChange={(e) => setExamples((a) => { const c = [...a]; c[i] = e.target.value; return c; })} /></div>
                            <div className="space-y-1"><Label className="text-xs">Campo do CRM no envio</Label>
                              <Select value={varFields[i + 1] ?? "manual"} onValueChange={(v) => setVarFields((s) => ({ ...s, [i + 1]: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{CRM_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                              </Select></div>
                          </div>
                        ))}
                        <ErrList k="examples" />
                      </div>
                    )}
                    <div className="space-y-1"><Label htmlFor="mt-f">Rodapé</Label><Input id="mt-f" maxLength={60} value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Responda SAIR para deixar de receber" /><p className="text-xs text-muted-foreground">{footer.length}/60</p><ErrList k="footer" /></div>
                  </>)}
                </AccordionContent>
              </AccordionItem>

              {category !== "AUTHENTICATION" && (
                <AccordionItem value="c">
                  <AccordionTrigger>C · Botões interativos {buttons.length > 0 && <Badge variant="secondary" className="ml-2">{buttons.length}</Badge>}</AccordionTrigger>
                  <AccordionContent className="space-y-3 px-1">
                    {buttons.map((b, i) => (
                      <div key={i} className="space-y-2 rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Select value={b.type} onValueChange={(v) => setButtons((a) => a.map((x, j) => j === i ? { ...x, type: v as MetaButton["type"] } : x))}>
                            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="QUICK_REPLY">Resposta rápida</SelectItem><SelectItem value="URL">Abrir website</SelectItem><SelectItem value="PHONE_NUMBER">Ligar</SelectItem></SelectContent>
                          </Select>
                          <Input className="flex-1 min-w-[140px]" aria-label={`Texto do botão ${i + 1}`} maxLength={25} value={b.text} placeholder="Quero saber mais"
                            onChange={(e) => setButtons((a) => a.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                          <Button type="button" size="icon" variant="ghost" aria-label="Subir" onClick={() => moveBtn(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                          <Button type="button" size="icon" variant="ghost" aria-label="Descer" onClick={() => moveBtn(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                          <Button type="button" size="icon" variant="ghost" aria-label="Remover botão" onClick={() => setButtons((a) => a.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        {b.type === "URL" && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input aria-label="Link" placeholder="https://site.pt/{{1}}" value={b.url ?? ""} onChange={(e) => setButtons((a) => a.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                            {/\{\{1\}\}/.test(b.url ?? "") && <Input aria-label="Exemplo do link" placeholder="https://site.pt/abc" value={b.urlExample ?? ""} onChange={(e) => setButtons((a) => a.map((x, j) => j === i ? { ...x, urlExample: e.target.value } : x))} />}
                          </div>
                        )}
                        {b.type === "PHONE_NUMBER" && <Input aria-label="Telefone" placeholder="+351912345678" value={b.phone ?? ""} onChange={(e) => setButtons((a) => a.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />}
                        {b.type === "QUICK_REPLY" && b.text.trim() && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Select value={btnActions[b.text]?.type || NONE} onValueChange={(v) => setBtnActions((s) => ({ ...s, [b.text]: { type: v === NONE ? "" : v, value: s[b.text]?.value ?? "" } }))}>
                              <SelectTrigger aria-label="Ação no CRM"><SelectValue placeholder="Ação no CRM" /></SelectTrigger>
                              <SelectContent><SelectItem value={NONE}>Sem ação</SelectItem>{ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                            </Select>
                            {btnActions[b.text]?.type === "run_workflow" ? (
                              <Select value={btnActions[b.text]?.value || NONE} onValueChange={(v) => setBtnActions((s) => ({ ...s, [b.text]: { type: "run_workflow", value: v === NONE ? "" : v } }))}>
                                <SelectTrigger aria-label="Workflow"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value={NONE}>Escolher…</SelectItem>{(opts.data?.workflows ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : btnActions[b.text]?.type && !["opt_out", "remove_sequence", "log_interaction"].includes(btnActions[b.text].type) ? (
                              <Input aria-label="Valor da ação" maxLength={120} placeholder="Ex.: interessado / etiqueta / título da tarefa" value={btnActions[b.text]?.value ?? ""}
                                onChange={(e) => setBtnActions((s) => ({ ...s, [b.text]: { ...s[b.text], value: e.target.value } }))} />
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                    <ErrList k="buttons" />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={buttons.length >= 10} onClick={() => setButtons((a) => [...a, { type: "QUICK_REPLY", text: "" }])}><Plus className="h-4 w-4 mr-1" />Adicionar botão</Button>
                      <Button type="button" size="sm" variant="outline" disabled={buttons.length >= 10 || buttons.some((b) => /^sair$/i.test(b.text))}
                        onClick={() => { setButtons((a) => [...a, { type: "QUICK_REPLY", text: "SAIR" }]); setBtnActions((s) => ({ ...s, SAIR: { type: "opt_out", value: "" } })); }}>Adicionar botão «SAIR»</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">«Não tenho interesse» não cancela o consentimento. Só «SAIR» (ou a ação de cancelamento) regista opt-out. As ações ficam guardadas e passam a correr automaticamente quando a receção de respostas da Meta estiver ativa.</p>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="d">
                <AccordionTrigger>D · Ligação às automações</AccordionTrigger>
                <AccordionContent className="grid gap-3 sm:grid-cols-2 px-1">
                  {sel("campaign_id", "Campanha", opts.data?.campaigns ?? [])}
                  {sel("pipeline_id", "Pipeline", opts.data?.pipelines ?? [])}
                  {sel("stage_id", "Etapa", (opts.data?.stages ?? []).filter((s) => !auto.pipeline_id || auto.pipeline_id === NONE || s.pipeline_id === auto.pipeline_id))}
                  {sel("sales_rep_id", "Responsável comercial", opts.data?.reps ?? [])}
                  {sel("workflow_id", "Workflow", opts.data?.workflows ?? [])}
                  <div className="space-y-1"><Label htmlFor="mt-tag">Etiqueta a aplicar</Label><Input id="mt-tag" maxLength={60} value={auto.tag ?? ""} onChange={(e) => setAuto((a) => ({ ...a, tag: e.target.value }))} /></div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="e">
                <AccordionTrigger>E · Validação e aprovação</AccordionTrigger>
                <AccordionContent className="space-y-2 px-1">
                  {hasErrors ? (
                    <ul className="space-y-1">{Object.values(localErrors).flat().map((m, i) => <li key={i} className="text-sm text-destructive flex gap-1"><AlertTriangle className="h-4 w-4 shrink-0" />{m}</li>)}</ul>
                  ) : <p className="text-sm text-primary flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Sem erros detetados.</p>}
                  {warnings.map((w, i) => <p key={i} className="text-sm text-muted-foreground flex gap-1"><AlertTriangle className="h-4 w-4 shrink-0" />{w}</p>)}
                  {template?.rejected_reason && <p className="text-sm text-destructive">Motivo indicado pela Meta: {template.rejected_reason}</p>}
                  <p className="text-xs text-muted-foreground">A submissão aceite fica «Pendente» até a Meta aprovar (minutos a 48 h).</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </fieldset>
          <div className="lg:sticky lg:top-0 self-start"><TemplatePreview draft={draft} mediaPreviewUrl={mediaUrl} /></div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {!locked && <>
            <Button variant="outline" onClick={() => save.mutate()} disabled={busy || !techName}>{save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar rascunho</Button>
            <Button variant="outline" onClick={() => validate.mutate()} disabled={busy}>{validate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Validar modelo</Button>
            <Button onClick={() => submit.mutate()} disabled={busy || hasErrors}>{submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar para aprovação</Button>
          </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
