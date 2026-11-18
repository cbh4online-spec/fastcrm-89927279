import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Lock, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { parseExcelFile } from "@/utils/excelUtils";
import { autoMapColumns, IMPORT_FIELDS, prepareRows, TEMPLATE_HEADERS, type ImportField, type PreparedRow } from "@/lib/studentJourney/historicalImport";
import { hintLabel, isRowReady, normText, reasonLabel, sha256Hex, STATUS_LABEL, type PreviewRow, type RowStatus } from "@/lib/studentJourney/importReconciliation";
import { useSjRole } from "@/hooks/useSjImportAccess";
import { ImportDecisionDialog } from "@/components/student-journey/ImportDecisionDialog";

const db = supabase as any;
const NONE = "__none__";
const CHUNK = 200;
type Step = 1 | 2 | 3 | 4 | 5;

interface Summary { contacts_created: number; profiles_created: number; enrollments_created: number; enrollments_linked: number;
  enrollments_existing: number; enrollments_completed_by_evidence: number; pending: { row: string; reason: string }[]; errors: { row: string; error: string }[] }

export default function SJHistoricalImport() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  const qc = useQueryClient();
  const { data: canManage, isLoading: roleLoading } = useSjRole();
  const [step, setStep] = useState<Step>(1);
  const [sourceLabel, setSourceLabel] = useState("");
  const [file, setFile] = useState<{ name: string; hash: string; sheet: string } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({});
  const [cohortId, setCohortId] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [filter, setFilter] = useState<"all" | "ready" | "pending">("pending");
  const [decide, setDecide] = useState<{ row: PreparedRow; preview: PreviewRow } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);

  const cohorts = useQuery({
    queryKey: ["sj-import-cohorts", ws], enabled: !!ws,
    queryFn: async () => {
      const { data, error } = await db.from("sj_cohorts").select("id,name,edition_code,start_date,course_id,sj_courses(name)")
        .eq("workspace_id", ws).order("start_date", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });
  const courses = useQuery({
    queryKey: ["sj-import-courses", ws], enabled: !!ws,
    queryFn: async () => {
      const { data, error } = await db.from("sj_courses").select("id,name").eq("workspace_id", ws).order("name").limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });
  const labelMaps = useQuery({
    queryKey: ["sj-import-label-maps", ws], enabled: !!ws && !!canManage,
    queryFn: async () => {
      const { data, error } = await db.from("sj_import_label_maps").select("id,label_raw,label_norm,course_id,cohort_id").eq("workspace_id", ws).limit(2000);
      if (error) throw error;
      return data as any[];
    },
  });

  const prepared = useMemo(() => prepareRows(rows, mapping), [rows, mapping]);
  const batch = useMemo(() => ({ source_label: sourceLabel.trim(), file_name: file?.name ?? "", file_hash: file?.hash ?? "", sheet_name: file?.sheet ?? "" }), [sourceLabel, file]);
  const payload = (r: PreparedRow) => ({ ...r });
  const cohort = cohorts.data?.find((c) => c.id === cohortId);
  const cohortName = (c: any) => `${c?.sj_courses?.name ?? "Curso"} — ${c?.edition_code || c?.name}`;

  const distinctLabels = useMemo(() => {
    const m = new Map<string, { raw: string; count: number }>();
    for (const r of prepared.valid) for (const l of r.labels) {
      const k = normText(l); if (!k) continue;
      const cur = m.get(k); m.set(k, { raw: cur?.raw ?? l, count: (cur?.count ?? 0) + 1 });
    }
    return [...m.entries()].map(([norm, v]) => ({ norm, ...v })).sort((a, b) => b.count - a.count);
  }, [prepared.valid]);
  const mapByNorm = useMemo(() => new Map((labelMaps.data ?? []).map((m) => [m.label_norm, m])), [labelMaps.data]);

  async function onFile(f: File) {
    try {
      const buf = await f.arrayBuffer();
      let h: string[] = []; let r: Record<string, string>[] = []; let sheet = "";
      if (/\.csv$/i.test(f.name)) {
        const res = Papa.parse<Record<string, string>>(new TextDecoder().decode(buf), { header: true, skipEmptyLines: true });
        h = res.meta.fields ?? []; r = res.data; sheet = "CSV";
      } else {
        const res = await parseExcelFile(buf);
        h = res.headers; r = res.rows; sheet = res.sheetName ?? "";
      }
      if (!r.length) { toast.error("O ficheiro não tem linhas."); return; }
      if (r.length > 5000) { toast.error("Máximo 5000 linhas por ficheiro."); return; }
      setFile({ name: f.name, hash: await sha256Hex(buf), sheet });
      setHeaders(h); setRows(r); setMapping(autoMapColumns(h)); setPreview(null); setStep(2);
    } catch (e: any) {
      toast.error(`Não foi possível ler o ficheiro: ${e?.message ?? e}`);
    }
  }

  function downloadTemplate() {
    const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: [] });
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "modelo-historico-alunos.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function saveLabelMap(label: string, courseId: string, cId: string | null) {
    const { error } = await db.rpc("sj_import_set_label_map", { _workspace_id: ws, _label: label, _course_id: courseId, _cohort_id: cId });
    if (error) { toast.error(`Não foi possível guardar: ${error.message}`); return; }
    toast.success("Designação mapeada."); labelMaps.refetch(); setPreview(null);
  }

  async function runPreview() {
    if (!ws || !cohortId) return;
    setLoadingPreview(true);
    try {
      const out: PreviewRow[] = [];
      for (let i = 0; i < prepared.valid.length; i += CHUNK) {
        const { data, error } = await db.rpc("sj_import_preview", { _workspace_id: ws, _cohort_id: cohortId, _batch: batch, _rows: prepared.valid.slice(i, i + CHUNK).map(payload) });
        if (error) throw error;
        out.push(...(data ?? []));
      }
      setPreview(out); setConfirmed(false); setStep(4);
    } catch (e: any) { toast.error(`Prévia falhou: ${e?.message ?? e}`); }
    finally { setLoadingPreview(false); }
  }

  const previewByRow = useMemo(() => new Map((preview ?? []).map((p) => [p.source_row, p])), [preview]);
  const readyRows = useMemo(() => prepared.valid.filter((r) => { const p = previewByRow.get(r.source_row); return p ? isRowReady(p) : false; }), [prepared.valid, previewByRow]);
  const plan = useMemo(() => {
    const ps = readyRows.map((r) => previewByRow.get(r.source_row)!);
    return {
      newContacts: ps.filter((p) => p.resolution?.contact === "new").length,
      newProfiles: ps.filter((p) => p.resolution?.profile === "new").length,
      existing: ps.filter((p) => p.existing_in_cohort?.length).length,
      legacy: ps.filter((p) => p.legacy_enrollments?.length && !p.existing_in_cohort?.length && p.resolution?.legacy && p.resolution.legacy !== "separate").length,
      pending: (preview?.length ?? 0) - ps.length,
    };
  }, [readyRows, previewByRow, preview]);

  async function run() {
    if (!ws || !cohortId || !confirmed) return;
    setRunning(true); setProgress(0);
    const total: Summary = { contacts_created: 0, profiles_created: 0, enrollments_created: 0, enrollments_linked: 0, enrollments_existing: 0, enrollments_completed_by_evidence: 0, pending: [], errors: [] };
    try {
      for (let i = 0; i < readyRows.length; i += CHUNK) {
        const { data, error } = await db.rpc("sj_import_historical_rows", { _workspace_id: ws, _cohort_id: cohortId, _batch: batch, _rows: readyRows.slice(i, i + CHUNK).map(payload) });
        if (error) throw error;
        for (const k of ["contacts_created", "profiles_created", "enrollments_created", "enrollments_linked", "enrollments_existing", "enrollments_completed_by_evidence"] as const) total[k] += data?.[k] ?? 0;
        total.pending.push(...(data?.pending ?? [])); total.errors.push(...(data?.errors ?? []));
        setProgress(Math.min(100, Math.round(((i + CHUNK) / readyRows.length) * 100)));
      }
      setSummary(total); setStep(5);
      qc.invalidateQueries({ queryKey: ["sj-profiles"] });
    } catch (e: any) {
      toast.error(`Importação interrompida: ${e?.message ?? e}`);
      setSummary(total); setStep(5);
    } finally { setRunning(false); }
  }

  const reset = () => { setStep(1); setRows([]); setHeaders([]); setSummary(null); setCohortId(""); setPreview(null); setFile(null); setConfirmed(false); };

  if (roleLoading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" aria-label="A carregar" /></div>;
  if (!canManage) return (
    <div className="p-6"><Card><CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground"><Lock className="h-4 w-4" />Só gestão ou secretaria desta organização pode importar histórico.</CardContent></Card></div>
  );

  const visiblePreview = (preview ?? []).filter((p) => filter === "all" || (filter === "ready" ? isRowReady(p) : !isRowReady(p)));
  const rowOf = (sr: string) => prepared.valid.find((r) => r.source_row === sr);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar histórico</h1>
        <p className="text-sm text-muted-foreground">Uma edição por execução. O servidor confirma cada aluno; casos duvidosos ficam pendentes até decisão.</p>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Passos">
        {["Ficheiro", "Colunas e edição", "Designações", "Prévia e decisões", "Resultado"].map((l, i) => (
          <li key={l}><Badge variant={step === i + 1 ? "default" : "outline"}>{i + 1}. {l}</Badge></li>
        ))}
      </ol>

      {step === 1 && (
        <Card><CardContent className="space-y-4 pt-6">
          <div className="max-w-md space-y-1">
            <Label htmlFor="src-label">Etiqueta de origem *</Label>
            <Input id="src-label" value={sourceLabel} maxLength={120} onChange={(e) => setSourceLabel(e.target.value)} placeholder="Ex.: Ficheiro Excel Pharliss" />
            <p className="text-xs text-muted-foreground">Fica registada em cada contacto, perfil e inscrição tocados. A origem anterior dos contactos existentes é preservada.</p>
          </div>
          <label className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center ${sourceLabel.trim() ? "cursor-pointer hover:bg-muted/50" : "opacity-50"}`}>
            <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
            <span className="font-medium">Escolher ficheiro Excel (.xlsx) ou CSV</span>
            <span className="text-xs text-muted-foreground">Primeira folha, primeira linha com os nomes das colunas · até 5000 linhas</span>
            <input type="file" accept=".xlsx,.csv" className="sr-only" disabled={!sourceLabel.trim()} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Descarregar modelo</Button>
        </CardContent></Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4" />{file?.name}{file?.sheet ? ` › ${file.sheet}` : ""} · {rows.length} linhas · {prepared.valid.length} ocorrências</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-md space-y-1">
              <Label>Edição de destino desta execução *</Label>
              <Select value={cohortId} onValueChange={(v) => { setCohortId(v); setPreview(null); }}>
                <SelectTrigger><SelectValue placeholder={cohorts.isLoading ? "A carregar…" : "Escolher edição"} /></SelectTrigger>
                <SelectContent>{(cohorts.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{cohortName(c)}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Só entram ocorrências cujas designações estejam mapeadas para esta edição.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}{f.key === "full_name" || f.key === "course_label" ? " *" : ""}</Label>
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
            {prepared.issues.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border border-border p-3 text-sm">
                {prepared.issues.slice(0, 200).map((i, k) => <li key={k} className={i.blocking ? "text-destructive" : "text-muted-foreground"}>Linha {i.row}: {i.message}</li>)}
              </ul>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={reset}>Voltar</Button>
              <Button disabled={!cohortId || !mapping.full_name || !mapping.course_label} onClick={() => setStep(3)}>Mapear designações</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Designações → curso e edição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Cada designação do ficheiro precisa de ser associada explicitamente. Só conta a mesma designação (ignorando maiúsculas, acentos e espaços); variantes, erros e rótulos truncados ficam por mapear. Nada é criado automaticamente.</p>
            <div className="overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader><TableRow><TableHead>Designação</TableHead><TableHead className="w-20">Ocorr.</TableHead><TableHead>Mapeamento atual</TableHead><TableHead className="w-[28rem]">Associar</TableHead></TableRow></TableHeader>
                <TableBody>
                  {distinctLabels.map((l) => {
                    const m = mapByNorm.get(l.norm);
                    return (
                      <TableRow key={l.norm}>
                        <TableCell className="font-medium">{l.raw}</TableCell>
                        <TableCell>{l.count}</TableCell>
                        <TableCell>{m ? <span>{courses.data?.find((c) => c.id === m.course_id)?.name ?? "Curso"}{m.cohort_id ? ` — ${cohortName(cohorts.data?.find((c) => c.id === m.cohort_id))}` : " (sem edição)"}{m.cohort_id === cohortId ? <Badge className="ml-2">Esta edição</Badge> : null}</span> : <Badge variant="outline">Por mapear</Badge>}</TableCell>
                        <TableCell><LabelMapEditor courses={courses.data ?? []} cohorts={cohorts.data ?? []} initial={m} onSave={(c, k) => saveLabelMap(l.raw, c, k)} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {!distinctLabels.length && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Sem designações no ficheiro — todas as linhas ficarão pendentes.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
              <Button disabled={loadingPreview} onClick={runPreview}>{loadingPreview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Pré-visualizar conciliação</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && preview && (
        <Card>
          <CardHeader><CardTitle className="text-base">Prévia — {cohortName(cohort)}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Prontas" value={readyRows.length} />
              <Stat label="Pendentes" value={plan.pending} />
              <Stat label="Contactos novos" value={plan.newContacts} />
              <Stat label="Perfis novos" value={plan.newProfiles} />
              <Stat label="Inscrições já existentes" value={plan.existing + plan.legacy} />
            </div>
            <div className="flex gap-2" role="group" aria-label="Filtro">
              {(["pending", "ready", "all"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "pending" ? "Pendentes" : f === "ready" ? "Prontas" : "Todas"}</Button>)}
            </div>
            <div className="max-h-[32rem] overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader><TableRow><TableHead className="w-20">Linha</TableHead><TableHead>Nome</TableHead><TableHead>Estado</TableHead><TableHead>Detalhe</TableHead><TableHead className="w-28" /></TableRow></TableHeader>
                <TableBody>
                  {visiblePreview.slice(0, 500).map((p) => {
                    const r = rowOf(p.source_row);
                    const pend = p.resolution?.pending;
                    const needsLegacy = !pend && p.legacy_enrollments?.length > 0 && !p.existing_in_cohort?.length && !p.resolution?.legacy;
                    const decidable = !!r && p.label_status === "ok" && (pend === "needs_decision" || pend === "decision_stale" || needsLegacy || !!p.stored_decision);
                    return (
                      <TableRow key={p.source_row}>
                        <TableCell>{p.source_row}</TableCell>
                        <TableCell>{r?.full_name}</TableCell>
                        <TableCell><Badge variant={isRowReady(p) ? "default" : "outline"}>{isRowReady(p) ? "Pronta" : STATUS_LABEL[p.status as RowStatus]}</Badge></TableCell>
                        <TableCell className="text-sm">
                          {p.label_status !== "ok" && <p className="text-destructive">{reasonLabel(p.label_status)}</p>}
                          {pend && <p className="text-destructive">{reasonLabel(pend)}</p>}
                          {needsLegacy && <p className="text-destructive">{reasonLabel("legacy_enrollment_needs_decision")}</p>}
                          {p.existing_in_cohort?.length > 0 && <p className="text-muted-foreground">Já inscrito nesta edição — só regista evidência</p>}
                          {p.hints?.map((h) => <p key={h.code} className="text-muted-foreground">{hintLabel(h.code)}: {h.value}</p>)}
                          {p.stored_decision && !p.stored_decision.stale && <p className="text-muted-foreground">Decisão registada: {p.stored_decision.reason}</p>}
                        </TableCell>
                        <TableCell>{decidable && <Button size="sm" variant="outline" onClick={() => setDecide({ row: r!, preview: p })}>Decidir</Button>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
              <Checkbox id="confirm-plan" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
              <label htmlFor="confirm-plan">Confirmo o plano: importar {readyRows.length} ocorrências prontas na edição «{cohortName(cohort)}» com a origem «{sourceLabel}». As {plan.pending} pendentes não são enviadas. Sem informação financeira fica «Não informado»; não são criados pagamentos, faturas nem certificados.</label>
            </div>
            {running && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />A importar… {progress}%</p>}
            <div className="flex justify-between">
              <Button variant="ghost" disabled={running} onClick={() => setStep(3)}>Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" disabled={running || loadingPreview} onClick={runPreview}>Atualizar prévia</Button>
                <Button disabled={running || !confirmed || readyRows.length === 0} onClick={run}>Importar {readyRows.length} ocorrências</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && summary && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4 text-primary" />Resultado da execução</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Contactos novos" value={summary.contacts_created} />
              <Stat label="Perfis novos" value={summary.profiles_created} />
              <Stat label="Inscrições criadas" value={summary.enrollments_created} />
              <Stat label="Inscrições antigas associadas" value={summary.enrollments_linked} />
              <Stat label="Já existentes (evidência)" value={summary.enrollments_existing} />
              <Stat label="Concluídas por evidência" value={summary.enrollments_completed_by_evidence} />
            </div>
            {(summary.pending.length > 0 || summary.errors.length > 0) && (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="mb-2 flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-destructive" />{summary.pending.length} pendentes · {summary.errors.length} erros (o servidor recusou ou mudaram os dados)</p>
                <ul className="max-h-48 space-y-1 overflow-auto text-muted-foreground">
                  {summary.pending.map((e, k) => <li key={`p${k}`}>Linha {e.row}: {reasonLabel(e.reason)}</li>)}
                  {summary.errors.map((e, k) => <li key={`e${k}`}>Linha {e.row}: {e.error}</li>)}
                </ul>
              </div>
            )}
            <Button onClick={reset}>Nova importação</Button>
          </CardContent>
        </Card>
      )}

      {decide && ws && (
        <ImportDecisionDialog open onOpenChange={(v) => !v && setDecide(null)} workspaceId={ws} cohortId={cohortId}
          batch={batch} row={payload(decide.row)} preview={decide.preview} onSaved={() => { setDecide(null); runPreview(); }} />
      )}
    </div>
  );
}

function LabelMapEditor({ courses, cohorts, initial, onSave }: { courses: any[]; cohorts: any[]; initial?: any; onSave: (courseId: string, cohortId: string | null) => void }) {
  const [course, setCourse] = useState<string>(initial?.course_id ?? "");
  const [coh, setCoh] = useState<string>(initial?.cohort_id ?? NONE);
  const list = cohorts.filter((c) => c.course_id === course);
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={course || undefined} onValueChange={(v) => { setCourse(v); setCoh(NONE); }}>
        <SelectTrigger className="w-44" aria-label="Curso"><SelectValue placeholder="Curso" /></SelectTrigger>
        <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={coh} onValueChange={setCoh} disabled={!course}>
        <SelectTrigger className="w-44" aria-label="Edição"><SelectValue placeholder="Edição" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sem edição (fica pendente)</SelectItem>
          {list.map((c) => <SelectItem key={c.id} value={c.id}>{c.edition_code || c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={!course} onClick={() => onSave(course, coh === NONE ? null : coh)}>Guardar</Button>
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
