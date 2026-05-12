import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Download, Plug, ScrollText, FileText, Calendar, MessageSquare,
  Database, Webhook, AlertTriangle, CheckCircle2, FileSpreadsheet, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { parseCSV, downloadFile, buildCSV } from "@/utils/leadchef/csv";
import {
  autoDetectMapping,
  CANONICAL_FIELDS,
  type CanonicalField,
} from "@/utils/leadchef/fieldMapping";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  buildImportPreview,
  IMPORT_ROW_LIMIT,
  useLeadChefImport,
  type ImportPreview,
} from "@/hooks/leadchef/useLeadChefImport";
import { useLeadChefExport, type ExportEntity } from "@/hooks/leadchef/useLeadChefExport";
import { useLeadChefAuditLogs } from "@/hooks/leadchef/useLeadChefAuditLogs";
import { useLeadChefPermissions } from "@/hooks/leadchef/useLeadChefPermissions";
import { AUDIT_ACTION_LABELS, type LeadChefAuditAction } from "@/utils/leadchef/audit";

const TABS = ["importar", "exportar", "integracoes", "auditoria"] as const;
type TabKey = (typeof TABS)[number];

export default function LeadChefSettingsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = (params.get("tab") as TabKey) ?? "importar";
  const tab = TABS.includes(tabParam) ? tabParam : "importar";

  return (
    <LeadChefMobileShell title="Ferramentas" subtitle="Importar, exportar, integrações e auditoria">
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="importar" className="text-xs"><Upload className="h-3 w-3 mr-1" />Importar</TabsTrigger>
          <TabsTrigger value="exportar" className="text-xs"><Download className="h-3 w-3 mr-1" />Exportar</TabsTrigger>
          <TabsTrigger value="integracoes" className="text-xs"><Plug className="h-3 w-3 mr-1" />Integrações</TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs"><ScrollText className="h-3 w-3 mr-1" />Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="mt-4"><ImportTab /></TabsContent>
        <TabsContent value="exportar" className="mt-4"><ExportTab /></TabsContent>
        <TabsContent value="integracoes" className="mt-4"><IntegrationsTab onGo={(t) => setParams({ tab: t })} /></TabsContent>
        <TabsContent value="auditoria" className="mt-4"><AuditTab /></TabsContent>
      </Tabs>
    </LeadChefMobileShell>
  );
}

/* ---------- IMPORT ---------- */

function ImportTab() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const importMut = useLeadChefImport();

  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<CanonicalField, string>>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [opts, setOpts] = useState({ skipDuplicates: true, skipInvalid: true });
  const [result, setResult] = useState<Awaited<ReturnType<typeof importMut.mutateAsync>> | null>(null);

  async function onFile(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande. Máximo 5MB.");
      return;
    }
    try {
      const text = await file.text();
      const result = parseCSV(text);
      if (result.headers.length === 0 || result.rows.length === 0) {
        toast.error("Não encontrámos colunas válidas.");
        return;
      }
      if (result.rows.length > IMPORT_ROW_LIMIT) {
        toast.warning(`Para manter a importação estável, divide o ficheiro em partes menores (máx ${IMPORT_ROW_LIMIT} linhas).`);
      }
      setParsed({ headers: result.headers, rows: result.rows });
      setMapping(autoDetectMapping(result.headers));
      setStep("mapping");
    } catch {
      toast.error("Não foi possível ler o ficheiro.");
    }
  }

  async function buildPreview() {
    if (!parsed || !workspaceId) return;
    if (!mapping.name) {
      toast.error("O campo Nome é obrigatório.");
      return;
    }
    // Carregar leads existentes para deteção de duplicados
    const { data: existing } = await (supabase as any)
      .from("leads")
      .select("id, name, phone, email")
      .eq("workspace_id", workspaceId)
      .limit(5000);
    const prev = buildImportPreview(parsed.rows, mapping, existing ?? []);
    setPreview(prev);
    setStep("preview");
  }

  async function runImport() {
    if (!preview) return;
    const res = await importMut.mutateAsync({ preview, options: opts });
    setResult(res);
    setStep("result");
  }

  function downloadErrorReport() {
    if (!result?.errors?.length) return;
    const csv = buildCSV(["Linha", "Erro"], result.errors.map((e) => ({ Linha: e.row, Erro: e.message })));
    downloadFile(`leadchef-import-erros-${Date.now()}.csv`, csv);
  }

  return (
    <div className="space-y-4">
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Importar CSV</CardTitle>
            <CardDescription>Para já, importa ficheiros CSV. Exporta o teu Excel como CSV.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="file">Ficheiro CSV</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <Alert>
              <AlertDescription className="text-xs">
                Cabeçalhos suportados: Nome, Telefone, Email, Origem, Interesse, Notas, Próxima ação,
                Data próxima ação, Temperatura, Etapa, Indicado por, Autorização. Separadores `,` ou `;`.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapear campos</CardTitle>
            <CardDescription>{parsed.rows.length} linhas detetadas. Confirma o mapeamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CANONICAL_FIELDS.map((f) => (
              <div key={f.key} className="grid grid-cols-2 gap-2 items-center">
                <Label className="text-sm">
                  {f.label}{f.required && <span className="text-red-500"> *</span>}
                </Label>
                <Select
                  value={mapping[f.key] ?? "__none"}
                  onValueChange={(v) =>
                    setMapping((m) => ({ ...m, [f.key]: v === "__none" ? undefined : v }))
                  }
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— ignorar —</SelectItem>
                    {parsed.headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={buildPreview} className="flex-1">Pré-visualizar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pré-visualização</CardTitle>
            <CardDescription>Revê antes de importar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Total" value={preview.total} />
              <Stat label="Válidas" value={preview.valid} tone="ok" />
              <Stat label="Avisos" value={preview.warnings} tone="warn" />
              <Stat label="Inválidas" value={preview.invalid} tone="bad" />
              <Stat label="Duplicados" value={preview.duplicates} tone="warn" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={opts.skipDuplicates} onCheckedChange={(v) => setOpts((o) => ({ ...o, skipDuplicates: !!v }))} />
                Ignorar duplicados
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={opts.skipInvalid} onCheckedChange={(v) => setOpts((o) => ({ ...o, skipInvalid: !!v }))} />
                Ignorar linhas inválidas
              </label>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2 bg-slate-50">
              {preview.rows.slice(0, 20).map((r) => (
                <div key={r.index} className="text-xs flex items-center gap-2">
                  <Badge variant={r.status === "invalid" ? "destructive" : r.status === "valid" ? "default" : "secondary"} className="shrink-0">
                    {r.status}
                  </Badge>
                  <span className="truncate">{r.mapped.name || "—"} · {r.mapped.phone || r.mapped.email || ""}</span>
                </div>
              ))}
              {preview.rows.length > 20 && (
                <div className="text-xs text-slate-500 text-center pt-2">… e mais {preview.rows.length - 20}</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
              <Button onClick={runImport} disabled={importMut.isPending} className="flex-1">
                {importMut.isPending ? "A importar…" : "Importar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Stat label="Criados" value={result.imported} tone="ok" />
              <Stat label="Ignorados" value={result.skipped} tone="warn" />
              <Stat label="Falhas" value={result.failed} tone={result.failed > 0 ? "bad" : "ok"} />
            </div>
            {result.errors?.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                <Download className="h-3 w-3 mr-1" />Descarregar relatório de erros
              </Button>
            )}
            <Button onClick={() => { setStep("upload"); setParsed(null); setPreview(null); setResult(null); }} className="w-full">
              Nova importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "ok" | "warn" | "bad" }) {
  const cls = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-red-600" : "text-slate-700";
  return (
    <div className="rounded-md border bg-white p-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

/* ---------- EXPORT ---------- */

function ExportTab() {
  const exportMut = useLeadChefExport();
  const [entity, setEntity] = useState<ExportEntity>("leads");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stage, setStage] = useState("");

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Os ficheiros podem conter dados pessoais. Guarda-os em local seguro.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar dados</CardTitle>
          <CardDescription>CSV em UTF-8, separador `;` (compatível com Excel pt-PT).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Entidade</Label>
            <Select value={entity} onValueChange={(v) => setEntity(v as ExportEntity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Referências</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
                <SelectItem value="referrals">Referências</SelectItem>
                <SelectItem value="agenda">Agenda</SelectItem>
                <SelectItem value="goals">Objetivos</SelectItem>
                <SelectItem value="experiences">Experiências Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          {entity === "leads" && (
            <div>
              <Label>Etapa (opcional)</Label>
              <Select value={stage || "all"} onValueChange={(v) => setStage(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="to_contact">A contactar</SelectItem>
                  <SelectItem value="talking">Em conversa</SelectItem>
                  <SelectItem value="demo_scheduled">Demo agendada</SelectItem>
                  <SelectItem value="demo_done">Demo concluída</SelectItem>
                  <SelectItem value="proposal_decision">Proposta</SelectItem>
                  <SelectItem value="won">Ganho</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={() =>
              exportMut.mutate({
                entity,
                filters: {
                  from: from ? new Date(from).toISOString() : undefined,
                  to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
                  stage: stage || undefined,
                },
              })
            }
            disabled={exportMut.isPending}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-1" />
            {exportMut.isPending ? "A exportar…" : "Exportar CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- INTEGRATIONS ---------- */

function IntegrationsTab({ onGo }: { onGo: (t: TabKey) => void }) {
  const items = [
    { icon: Calendar, title: "Calendário externo", state: "Disponível via ficheiro .ics", action: "Exporta compromissos da Agenda", tone: "ok" },
    { icon: MessageSquare, title: "WhatsApp", state: "Via link wa.me", action: "Usa templates no detalhe do lead", tone: "ok" },
    { icon: FileSpreadsheet, title: "CSV", state: "Ativo", action: "Importar / Exportar", tone: "ok", to: "exportar" as TabKey },
    { icon: Database, title: "API externa", state: "Preparado, não configurado", action: "Documentação na fase futura", tone: "neutral" },
    { icon: Webhook, title: "Webhooks", state: "Indisponível por agora", action: "Planeado", tone: "neutral" },
  ];
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Card key={it.title}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
              <it.icon className="h-5 w-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{it.title}</div>
                <Badge variant={it.tone === "ok" ? "default" : "secondary"} className="text-[10px]">{it.state}</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1">{it.action}</div>
              {it.to && (
                <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" onClick={() => onGo(it.to!)}>
                  Abrir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------- AUDIT ---------- */

function AuditTab() {
  const perms = useLeadChefPermissions();
  const [actionFilter, setActionFilter] = useState<string>("");
  const { data: logs, isLoading } = useLeadChefAuditLogs({
    action: actionFilter || undefined,
    limit: 200,
  });

  if (!perms.canViewTeam && !perms.isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Esta área está disponível para administradores.</AlertDescription>
      </Alert>
    );
  }

  const actions = useMemo(() => Object.entries(AUDIT_ACTION_LABELS), []);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3">
          <Label className="text-xs">Filtrar por ação</Label>
          <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {actions.map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center text-sm text-slate-500 py-8">A carregar…</div>
      ) : !logs || logs.length === 0 ? (
        <div className="text-center text-sm text-slate-500 py-8 border rounded-md bg-white">
          Sem registos para os filtros atuais.
        </div>
      ) : (
        logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {AUDIT_ACTION_LABELS[log.action as LeadChefAuditAction] ?? log.action}
                </Badge>
                <div className="text-[11px] text-slate-500">
                  {new Date(log.created_at).toLocaleString("pt-PT")}
                </div>
              </div>
              {log.description && <div className="text-sm">{log.description}</div>}
              <div className="text-[11px] text-slate-500">
                {log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
