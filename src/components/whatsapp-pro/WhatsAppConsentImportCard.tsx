import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Download, FileUp, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CONSENT_IMPORT_OPTIONAL_FIELDS,
  CONSENT_IMPORT_REQUIRED_FIELDS,
  guessConsentMapping,
  planConsentImport,
  validateConsentImport,
  type ConsentImportMapping,
  type ConsentImportRawRow,
  type ConsentImportRejectedRow,
  type ExistingConsentSnapshot,
} from "@/lib/whatsapp/consentImport";
import { WHATSAPP_CONSENT_TEXT } from "@/lib/whatsapp/consent";

const MAX_ROWS = 20000;
const NONE = "__none__";

interface Summary {
  dryRun: boolean;
  totalRows: number;
  valid: number;
  rejected: number;
  duplicates: number;
  existing: number;
  withoutLead: number;
  written: number;
}

/** Importação autenticada de consentimentos já obtidos, com preview, mapeamento e dry-run. */
export function WhatsAppConsentImportCard() {
  const { currentWorkspace } = useWorkspace();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ConsentImportRawRow[]>([]);
  const [mapping, setMapping] = useState<ConsentImportMapping>({});
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errorRows, setErrorRows] = useState<ConsentImportRejectedRow[]>([]);

  const preview = useMemo(
    () => (rows.length ? validateConsentImport(rows.slice(0, 200), mapping) : null),
    [rows, mapping],
  );

  function reset() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSummary(null);
    setErrorRows([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(file: File) {
    Papa.parse<ConsentImportRawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result.data ?? []).slice(0, MAX_ROWS);
        if (parsed.length === 0) {
          toast.error("Ficheiro sem linhas válidas");
          return;
        }
        const cols = (result.meta.fields ?? []).filter(Boolean) as string[];
        setFileName(file.name);
        setHeaders(cols);
        setRows(parsed);
        setMapping(guessConsentMapping(cols));
        setSummary(null);
        setErrorRows([]);
      },
      error: () => toast.error("Não foi possível ler o CSV"),
    });
  }

  async function run(dryRun: boolean) {
    if (!currentWorkspace) return;
    setRunning(true);
    try {
      const result = validateConsentImport(rows, mapping);

      // Estado atual do workspace (RLS garante o isolamento).
      const existing: ExistingConsentSnapshot[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("whatsapp_consents")
          .select("phone, consent_category, status, updated_at")
          .eq("workspace_id", currentWorkspace.id)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const page = data ?? [];
        for (const r of page) {
          existing.push({
            phone: r.phone,
            scope: r.consent_category,
            status: r.status as ExistingConsentSnapshot["status"],
            updatedAt: r.updated_at,
          });
        }
        if (page.length < pageSize) break;
      }

      const plan = planConsentImport(result.valid, existing);
      const rejected = [...result.rejected, ...plan.skippedNewerRevocation];

      // Associação a Leads do próprio workspace (informativo; nunca cria Leads).
      const phones = plan.toUpsert.map((r) => r.phone);
      const leadByPhone = new Map<string, string>();
      for (let i = 0; i < phones.length; i += 200) {
        const chunk = phones.slice(i, i + 200);
        const { data } = await supabase
          .from("leads")
          .select("id, phone")
          .eq("workspace_id", currentWorkspace.id)
          .is("archived_at", null)
          .in("phone", chunk);
        for (const lead of data ?? []) if (lead.phone) leadByPhone.set(lead.phone, lead.id);
      }
      const withoutLead = plan.toUpsert.filter((r) => !leadByPhone.has(r.phone)).length;

      let written = 0;
      if (!dryRun && plan.toUpsert.length > 0) {
        const now = new Date().toISOString();
        const records = plan.toUpsert.map((r) => ({
          workspace_id: currentWorkspace.id,
          phone: r.phone,
          lead_id: leadByPhone.get(r.phone) ?? null,
          status: r.status,
          consent_category: r.scope,
          consent_text: WHATSAPP_CONSENT_TEXT,
          consent_version: r.textVersion ?? "importado",
          source: "manual_import" as const,
          source_reference: r.proofReference || r.source,
          granted_at: r.status === "granted" ? r.capturedAt : null,
          revoked_at: r.status === "revoked" ? r.capturedAt : null,
          metadata: { import_source: r.source, proof_reference: r.proofReference, file: fileName },
          updated_at: now,
        }));
        for (let i = 0; i < records.length; i += 200) {
          const { error } = await supabase
            .from("whatsapp_consents")
            .upsert(records.slice(i, i + 200), { onConflict: "workspace_id,phone,consent_category" });
          if (error) throw error;
          written += records.slice(i, i + 200).length;
        }
      }

      await supabase.from("whatsapp_consent_import_batches").insert({
        workspace_id: currentWorkspace.id,
        file_name: fileName,
        dry_run: dryRun,
        total_rows: result.totalRows,
        accepted_rows: plan.toUpsert.length,
        rejected_rows: rejected.length,
        duplicate_rows: result.duplicates,
        existing_rows: plan.alreadyExisting,
        without_lead_rows: withoutLead,
        summary: { written },
      });

      setErrorRows(rejected);
      setSummary({
        dryRun,
        totalRows: result.totalRows,
        valid: plan.toUpsert.length,
        rejected: rejected.length,
        duplicates: result.duplicates,
        existing: plan.alreadyExisting,
        withoutLead,
        written,
      });
      toast.success(
        dryRun
          ? `Simulação concluída: ${plan.toUpsert.length} válidos, ${rejected.length} rejeitados`
          : `${written} consentimentos importados`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na importação");
    } finally {
      setRunning(false);
    }
  }

  function downloadErrors() {
    const csv = Papa.unparse(
      errorRows.map((r) => ({ linha: r.line, telefone: r.phone, motivo: r.reason })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `erros-consentimentos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const missingRequired = CONSENT_IMPORT_REQUIRED_FIELDS.filter((f) => !mapping[f]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5" /> Importar consentimentos obtidos
        </CardTitle>
        <CardDescription>
          CSV com <code>telefone</code>, <code>status</code>, <code>captured_at</code>, <code>source</code> e{" "}
          <code>proof_reference</code>. Opcionais: <code>scope</code> e <code>text_version</code>. Linhas
          <em> granted</em> sem prova verificável são sempre rejeitadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Escolher ficheiro
          </Button>
          {fileName && (
            <>
              <span className="text-sm text-muted-foreground">{fileName} · {rows.length} linhas</span>
              <Button variant="ghost" size="sm" onClick={reset}>Limpar</Button>
            </>
          )}
        </div>

        {headers.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...CONSENT_IMPORT_REQUIRED_FIELDS, ...CONSENT_IMPORT_OPTIONAL_FIELDS].map((field) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs">
                  {field}
                  {(CONSENT_IMPORT_REQUIRED_FIELDS as readonly string[]).includes(field) && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <Select
                  value={mapping[field] ?? NONE}
                  onValueChange={(v) =>
                    setMapping((m) => ({ ...m, [field]: v === NONE ? undefined : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {missingRequired.length > 0 && headers.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Mapeamento incompleto</AlertTitle>
            <AlertDescription>Faltam: {missingRequired.join(", ")}</AlertDescription>
          </Alert>
        )}

        {preview && preview.valid.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Prova</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.valid.slice(0, 10).map((r) => (
                  <TableRow key={`${r.phone}-${r.line}`}>
                    <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "granted" ? "default" : "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(r.capturedAt).toLocaleString("pt-PT")}</TableCell>
                    <TableCell className="text-xs">{r.source}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">{r.proofReference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={running || missingRequired.length > 0} onClick={() => run(true)}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Simular (dry-run)
            </Button>
            <Button
              disabled={running || missingRequired.length > 0 || !summary?.dryRun}
              onClick={() => run(false)}
            >
              Importar definitivamente
            </Button>
          </div>
        )}

        {summary && (
          <div className="space-y-2 rounded-md border p-3" data-testid="consent-import-summary">
            <p className="text-sm font-medium">
              {summary.dryRun ? "Resultado da simulação" : "Importação concluída"}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Linhas" value={summary.totalRows} />
              <Stat label="Válidos" value={summary.valid} />
              <Stat label="Rejeitados" value={summary.rejected} />
              <Stat label="Duplicados" value={summary.duplicates} />
              <Stat label="Já existentes" value={summary.existing} />
              <Stat label="Sem Lead" value={summary.withoutLead} />
            </div>
            {errorRows.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadErrors}>
                <Download className="mr-2 h-4 w-4" /> Descarregar erros ({errorRows.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-muted/40 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
