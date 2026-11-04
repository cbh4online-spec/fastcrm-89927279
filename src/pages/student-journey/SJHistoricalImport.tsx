import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { parseExcelFile } from "@/utils/excelUtils";
import {
  autoMapColumns, DEDUPE_LABEL, IMPORT_FIELDS, prepareRows, TEMPLATE_HEADERS,
  type DedupeKey, type ImportField,
} from "@/lib/studentJourney/historicalImport";

const db = supabase as any;
const NONE = "__none__";
const CHUNK = 200;
type Step = 1 | 2 | 3 | 4;

interface Summary { contacts_created: number; contacts_reused: number; enrollments_created: number; enrollments_skipped: number; certificates: number; errors: { row: string; error: string }[] }

export default function SJHistoricalImport() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({});
  const [dedupe, setDedupe] = useState<DedupeKey>("email");
  const [cohortId, setCohortId] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);

  const cohorts = useQuery({
    queryKey: ["sj-import-cohorts", ws],
    enabled: !!ws,
    queryFn: async () => {
      const { data, error } = await db.from("sj_cohorts").select("id,name,edition_code,start_date,sj_courses(name)")
        .eq("workspace_id", ws).order("start_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const prepared = useMemo(() => prepareRows(rows, mapping, dedupe), [rows, mapping, dedupe]);

  async function onFile(f: File) {
    try {
      let h: string[] = []; let r: Record<string, string>[] = [];
      if (/\.csv$/i.test(f.name)) {
        const res = Papa.parse<Record<string, string>>(await f.text(), { header: true, skipEmptyLines: true });
        h = res.meta.fields ?? []; r = res.data;
      } else {
        const res = await parseExcelFile(await f.arrayBuffer());
        h = res.headers; r = res.rows;
      }
      if (!r.length) { toast.error("O ficheiro não tem linhas."); return; }
      if (r.length > 5000) { toast.error("Máximo 5000 linhas por ficheiro."); return; }
      setFileName(f.name); setHeaders(h); setRows(r); setMapping(autoMapColumns(h)); setStep(2);
    } catch (e: any) {
      toast.error(`Não foi possível ler o ficheiro: ${e?.message ?? e}`);
    }
  }

  function downloadTemplate() {
    const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: [["Ana Silva", "ana@exemplo.pt", "912345678", "123456789", "C001", "Concluído", "Pago", "450,00", "15/06/2024", "Sim", "20/06/2024", ""]] });
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "modelo-historico-alunos.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function run() {
    if (!ws || !cohortId) return;
    setRunning(true); setProgress(0);
    const total: Summary = { contacts_created: 0, contacts_reused: 0, enrollments_created: 0, enrollments_skipped: 0, certificates: 0, errors: [] };
    try {
      for (let i = 0; i < prepared.valid.length; i += CHUNK) {
        const { data, error } = await db.rpc("sj_import_historical_rows", {
          _workspace_id: ws, _cohort_id: cohortId, _dedupe_key: dedupe, _rows: prepared.valid.slice(i, i + CHUNK), _file_name: fileName,
        });
        if (error) throw error;
        for (const k of ["contacts_created", "contacts_reused", "enrollments_created", "enrollments_skipped", "certificates"] as const) total[k] += data?.[k] ?? 0;
        total.errors.push(...(data?.errors ?? []));
        setProgress(Math.min(100, Math.round(((i + CHUNK) / prepared.valid.length) * 100)));
      }
      setSummary(total); setStep(4);
      qc.invalidateQueries({ queryKey: ["sj-profiles"] });
    } catch (e: any) {
      toast.error(`Importação interrompida: ${e?.message ?? e}`);
      if (total.enrollments_created) { setSummary(total); setStep(4); }
    } finally { setRunning(false); }
  }

  const reset = () => { setStep(1); setRows([]); setHeaders([]); setSummary(null); setCohortId(""); };
  const blocking = prepared.issues.filter((i) => i.blocking);
  const warnings = prepared.issues.filter((i) => !i.blocking);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar histórico</h1>
        <p className="text-sm text-muted-foreground">Traga alunos e formações antigas de Excel ou CSV, sem criar duplicados.</p>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Passos">
        {["Ficheiro", "Colunas", "Verificar", "Resultado"].map((l, i) => (
          <li key={l}><Badge variant={step === i + 1 ? "default" : "outline"}>{i + 1}. {l}</Badge></li>
        ))}
      </ol>

      {step === 1 && (
        <Card><CardContent className="space-y-4 pt-6">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center hover:bg-muted/50">
            <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
            <span className="font-medium">Escolher ficheiro Excel (.xlsx) ou CSV</span>
            <span className="text-xs text-muted-foreground">Primeira linha com os nomes das colunas · até 5000 linhas</span>
            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Descarregar modelo</Button>
        </CardContent></Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4" />{fileName} · {rows.length} linhas</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Turma / edição de destino *</Label>
                <Select value={cohortId} onValueChange={setCohortId}>
                  <SelectTrigger><SelectValue placeholder={cohorts.isLoading ? "A carregar…" : "Escolher turma"} /></SelectTrigger>
                  <SelectContent>
                    {(cohorts.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.sj_courses?.name ?? "Curso"} — {c.edition_code || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cohorts.data?.length === 0 && <p className="text-xs text-muted-foreground">Crie primeiro a turma em Turmas.</p>}
              </div>
              <div className="space-y-1">
                <Label>Reconhecer aluno existente por</Label>
                <Select value={dedupe} onValueChange={(v) => setDedupe(v as DedupeKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(DEDUPE_LABEL) as DedupeKey[]).map((k) => <SelectItem key={k} value={k}>{DEDUPE_LABEL[k]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}{f.key === "full_name" ? " *" : ""}</Label>
                  <Select value={mapping[f.key] ?? NONE} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === NONE ? undefined : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Não importar —</SelectItem>
                      {headers.filter(Boolean).map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}>Voltar</Button>
              <Button disabled={!cohortId || !mapping.full_name} onClick={() => setStep(3)}>Verificar dados</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Antes de importar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Prontas a importar" value={prepared.valid.length} />
              <Stat label="Recusadas" value={blocking.length} />
              <Stat label="Avisos" value={warnings.length} />
            </div>
            {prepared.issues.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-20">Linha</TableHead><TableHead>Problema</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {prepared.issues.slice(0, 300).map((i, k) => (
                      <TableRow key={k}><TableCell>{i.row}</TableCell><TableCell className={i.blocking ? "text-destructive" : "text-muted-foreground"}>{i.message}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Pedagógico</TableHead><TableHead>Financeiro</TableHead><TableHead>Certificado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {prepared.valid.slice(0, 10).map((r) => (
                    <TableRow key={r.source_row}><TableCell>{r.full_name}</TableCell><TableCell>{r.email || "—"}</TableCell><TableCell>{r.pedagogic_status}</TableCell><TableCell>{r.financial_status}</TableCell><TableCell>{r.certificate_issued ? "Sim" : "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Alunos que já existam (por {DEDUPE_LABEL[dedupe]}) são reaproveitados; inscrições já existentes nesta turma são ignoradas.</p>
            {running && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />A importar… {progress}%</p>}
            <div className="flex justify-between">
              <Button variant="ghost" disabled={running} onClick={() => setStep(2)}>Voltar</Button>
              <Button disabled={running || prepared.valid.length === 0} onClick={run}>Importar {prepared.valid.length} linhas</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && summary && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4 text-primary" />Importação concluída</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Contactos novos" value={summary.contacts_created} />
              <Stat label="Contactos existentes" value={summary.contacts_reused} />
              <Stat label="Inscrições criadas" value={summary.enrollments_created} />
              <Stat label="Já inscritos (ignorados)" value={summary.enrollments_skipped} />
              <Stat label="Certificados" value={summary.certificates} />
            </div>
            {summary.errors.length > 0 && (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="mb-2 flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-destructive" />{summary.errors.length} linhas com erro</p>
                <ul className="max-h-48 space-y-1 overflow-auto text-muted-foreground">{summary.errors.map((e, k) => <li key={k}>Linha {e.row}: {e.error}</li>)}</ul>
              </div>
            )}
            <Button onClick={reset}>Nova importação</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
