import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { isValidPhone, toE164 } from "@/utils/phone";

const NONE = "__none__";
const BATCH_SIZE = 100;
const MAX_ROWS = 5000;

type Step = "upload" | "mapping" | "preview" | "importing" | "summary";

interface ParsedRow {
  line: number;
  name: string;
  email: string;
  phone: string;
}

interface RowIssue {
  line: number;
  name: string;
  email: string;
  phone: string;
  reason: string;
}

interface ImportSummary {
  imported: number;
  skippedFile: RowIssue[];
  skippedWorkspace: RowIssue[];
  invalid: RowIssue[];
  failed: RowIssue[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizeHeader = (h: string) =>
  h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

function guessColumn(headers: string[], candidates: string[]): string {
  for (const candidate of candidates) {
    const found = headers.find((h) => normalizeHeader(h) === candidate);
    if (found) return found;
  }
  for (const candidate of candidates) {
    const found = headers.find((h) => normalizeHeader(h).includes(candidate));
    if (found) return found;
  }
  return NONE;
}

const normalizeEmail = (v: string) => v.trim().toLowerCase();
const normalizePhoneKey = (v: string) => {
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactsCsvImportDialog({ open, onOpenChange }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapName, setMapName] = useState(NONE);
  const [mapEmail, setMapEmail] = useState(NONE);
  const [mapPhone, setMapPhone] = useState(NONE);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapName(NONE);
    setMapEmail(NONE);
    setMapPhone(NONE);
    setSkipDuplicates(true);
    setProgress(0);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next && step === "importing") return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleTemplate = () => {
    downloadCsv("modelo-contactos.csv", [
      ["nome", "email", "telefone"],
      ["Ana Silva", "ana.silva@exemplo.pt", "+351912345678"],
      ["", "sem.nome@exemplo.pt", ""],
      ["João Costa", "", "+351934567890"],
    ]);
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Selecione um ficheiro CSV.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx. 5 MB).");
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        const cols = (result.meta.fields || []).filter(Boolean);
        if (cols.length === 0 || result.data.length === 0) {
          toast.error("O ficheiro está vazio ou não tem cabeçalhos.");
          return;
        }
        if (result.data.length > MAX_ROWS) {
          toast.error(`Máximo de ${MAX_ROWS} linhas por importação.`);
          return;
        }
        setFileName(file.name);
        setHeaders(cols);
        setRawRows(result.data);
        setMapName(guessColumn(cols, ["nome", "name", "nomecompleto", "fullname", "contacto"]));
        setMapEmail(guessColumn(cols, ["email", "mail", "correioeletronico"]));
        setMapPhone(guessColumn(cols, ["telefone", "telemovel", "phone", "mobile", "contactotelefonico"]));
        setStep("mapping");
      },
      error: () => toast.error("Não foi possível ler o ficheiro CSV."),
    });
  };

  const parsedRows: ParsedRow[] = useMemo(() => {
    return rawRows.map((row, index) => ({
      line: index + 2,
      name: (mapName !== NONE ? row[mapName] || "" : "").trim(),
      email: (mapEmail !== NONE ? row[mapEmail] || "" : "").trim(),
      phone: (mapPhone !== NONE ? row[mapPhone] || "" : "").trim(),
    }));
  }, [rawRows, mapName, mapEmail, mapPhone]);

  const validation = useMemo(() => {
    const valid: (ParsedRow & { emailKey: string; phoneKey: string })[] = [];
    const invalid: RowIssue[] = [];
    const duplicatesInFile: RowIssue[] = [];
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    const seenName = new Set<string>();

    for (const row of parsedRows) {
      const emailKey = row.email ? normalizeEmail(row.email) : "";
      const phoneKey = row.phone ? normalizePhoneKey(row.phone) : "";

      if (!emailKey && !phoneKey && !row.name) {
        invalid.push({ ...row, reason: "Linha sem dados" });
        continue;
      }
      if (!emailKey && !phoneKey) {
        invalid.push({ ...row, reason: "É obrigatório email ou telefone" });
        continue;
      }
      if (emailKey && !EMAIL_RE.test(emailKey)) {
        invalid.push({ ...row, reason: "Email inválido" });
        continue;
      }
      if (phoneKey && !isValidPhone(row.phone)) {
        invalid.push({ ...row, reason: "Telefone inválido" });
        continue;
      }
      if (row.name.length > 200) {
        invalid.push({ ...row, reason: "Nome demasiado longo (máx. 200)" });
        continue;
      }

      const nameKey = row.name ? normalizeHeader(row.name) : "";
      const isDup =
        (emailKey && seenEmail.has(emailKey)) ||
        (phoneKey && seenPhone.has(phoneKey)) ||
        (!emailKey && !phoneKey && nameKey && seenName.has(nameKey));
      if (isDup) {
        duplicatesInFile.push({ ...row, reason: "Duplicado dentro do ficheiro" });
        continue;
      }
      if (emailKey) seenEmail.add(emailKey);
      if (phoneKey) seenPhone.add(phoneKey);
      if (nameKey) seenName.add(nameKey);
      valid.push({ ...row, emailKey, phoneKey });
    }

    return { valid, invalid, duplicatesInFile };
  }, [parsedRows]);

  const canContinueMapping = mapEmail !== NONE || mapPhone !== NONE;

  const runImport = async () => {
    if (!currentWorkspace || !user) {
      toast.error("Sessão ou workspace indisponível.");
      return;
    }
    setStep("importing");
    setProgress(0);

    const skippedWorkspace: RowIssue[] = [];
    const failed: RowIssue[] = [];
    let imported = 0;

    try {
      // Existing contacts in the workspace (email/phone keys)
      const existingEmails = new Set<string>();
      const existingPhones = new Set<string>();
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await workspaceClient
          .from("contacts")
          .select("email, phone")
          .eq("workspace_id", currentWorkspace.id)
          .is("deleted_at", null)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        (data || []).forEach((c) => {
          if (c.email) existingEmails.add(normalizeEmail(c.email));
          if (c.phone) existingPhones.add(normalizePhoneKey(c.phone));
        });
        if (!data || data.length < pageSize) break;
      }

      const toInsert = validation.valid.filter((row) => {
        const dup =
          (row.emailKey && existingEmails.has(row.emailKey)) ||
          (row.phoneKey && existingPhones.has(row.phoneKey));
        if (dup) {
          skippedWorkspace.push({
            line: row.line,
            name: row.name,
            email: row.email,
            phone: row.phone,
            reason: "Já existe no workspace",
          });
          return false;
        }
        return true;
      });

      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const payload = batch.map((row) => ({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: row.name || row.email || row.phone,
          email: row.email ? normalizeEmail(row.email) : null,
          phone: row.phone ? toE164(row.phone) || row.phone.trim() : null,
          tags: ["importado-csv"],
        }));

        const { data, error } = await workspaceClient
          .from("contacts")
          .insert(payload)
          .select("id");

        if (error) {
          // Fall back to row-by-row so a single bad row doesn't drop the batch
          for (const row of batch) {
            const { error: rowError } = await workspaceClient.from("contacts").insert({
              workspace_id: currentWorkspace.id,
              created_by: user.id,
              name: row.name || row.email || row.phone,
              email: row.email ? normalizeEmail(row.email) : null,
              phone: row.phone ? toE164(row.phone) || row.phone.trim() : null,
              tags: ["importado-csv"],
            });
            if (rowError) {
              failed.push({
                line: row.line,
                name: row.name,
                email: row.email,
                phone: row.phone,
                reason:
                  rowError.code === "23505"
                    ? "Duplicado (rejeitado pela base de dados)"
                    : "Erro ao inserir",
              });
            } else {
              imported += 1;
            }
          }
        } else {
          imported += data?.length ?? batch.length;
        }

        setProgress(Math.round(((i + batch.length) / Math.max(toInsert.length, 1)) * 100));
      }

      setSummary({
        imported,
        skippedFile: validation.duplicatesInFile,
        skippedWorkspace,
        invalid: validation.invalid,
        failed,
      });
      setStep("summary");
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace.id] });
      queryClient.invalidateQueries({ queryKey: ["smart-contacts", currentWorkspace.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts-kpis", currentWorkspace.id] });
      toast.success(`${imported} contacto(s) importado(s)`);
    } catch (error) {
      console.warn("[CONTACTS_IMPORT] FAILED", error);
      toast.error("Erro ao importar contactos. Nenhuma alteração adicional foi feita.");
      setStep("preview");
    }
  };

  const downloadErrors = () => {
    if (!summary) return;
    const rows: string[][] = [["linha", "nome", "email", "telefone", "motivo"]];
    [...summary.invalid, ...summary.skippedFile, ...summary.skippedWorkspace, ...summary.failed].forEach(
      (issue) => rows.push([String(issue.line), issue.name, issue.email, issue.phone, issue.reason]),
    );
    downloadCsv("erros-importacao-contactos.csv", rows);
  };

  const previewRows = validation.valid.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar contactos (CSV)</DialogTitle>
          <DialogDescription>
            Importação segura: valida, deteta duplicados e não dispara automações.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FileUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Ficheiro CSV com colunas de nome, email e/ou telefone (máx. {MAX_ROWS} linhas).
              </p>
              <input
                ref={fileInputRef}
                id="contacts-csv-input"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
                Escolher ficheiro
              </Button>
            </div>
            <Button variant="outline" onClick={handleTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Descarregar modelo CSV
            </Button>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {fileName} · {rawRows.length} linha(s)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Nome", value: mapName, set: setMapName },
                { label: "Email", value: mapEmail, set: setMapEmail },
                { label: "Telefone", value: mapPhone, set: setMapPhone },
              ].map((field) => (
                <div key={field.label} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Select value={field.value} onValueChange={field.set}>
                    <SelectTrigger>
                      <SelectValue placeholder="Não importar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Não importar</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {!canContinueMapping && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Mapeie pelo menos o email ou o telefone.
              </p>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="skip-duplicates">Ignorar duplicados</Label>
                <p className="text-xs text-muted-foreground">
                  Linhas já existentes no workspace são ignoradas.
                </p>
              </div>
              <Switch
                id="skip-duplicates"
                checked={skipDuplicates}
                onCheckedChange={() => toast.info("Nesta versão os duplicados são sempre ignorados.")}
              />
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{validation.valid.length} prontos</Badge>
              <Badge variant="outline">{validation.duplicatesInFile.length} duplicados no ficheiro</Badge>
              <Badge variant="outline">{validation.invalid.length} inválidos</Badge>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60">
                  <tr>
                    <th className="p-2 text-left font-medium">Nome</th>
                    <th className="p-2 text-left font-medium">Email</th>
                    <th className="p-2 text-left font-medium">Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.line} className="border-t">
                      <td className="p-2">{row.name || <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-2">{row.email || <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-2">{row.phone || <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                  {previewRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        Nenhuma linha válida para importar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
            {validation.valid.length > previewRows.length && (
              <p className="text-xs text-muted-foreground">
                A mostrar as primeiras {previewRows.length} de {validation.valid.length} linhas.
              </p>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">A importar contactos…</p>
            <Progress value={progress} />
          </div>
        )}

        {step === "summary" && summary && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="font-medium">{summary.imported} contacto(s) importado(s)</span>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Duplicados no ficheiro ignorados: {summary.skippedFile.length}</li>
              <li>Já existentes no workspace: {summary.skippedWorkspace.length}</li>
              <li>Linhas inválidas: {summary.invalid.length}</li>
              <li>Falhas de inserção: {summary.failed.length}</li>
            </ul>
            {summary.invalid.length + summary.skippedFile.length + summary.skippedWorkspace.length + summary.failed.length >
              0 && (
              <Button variant="outline" onClick={downloadErrors}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Descarregar CSV de erros
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "mapping" && (
            <>
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button disabled={!canContinueMapping} onClick={() => setStep("preview")}>
                Pré-visualizar
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                Voltar
              </Button>
              <Button disabled={validation.valid.length === 0} onClick={runImport}>
                Importar {validation.valid.length} contactos
              </Button>
            </>
          )}
          {step === "summary" && <Button onClick={() => handleClose(false)}>Concluir</Button>}
          {step === "upload" && (
            <Button variant="ghost" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
