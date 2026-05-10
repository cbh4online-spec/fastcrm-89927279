import { useMemo, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { Helmet } from "react-helmet-async";
import { Loader2, Upload, CheckCircle2, AlertTriangle, XCircle, Download, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toE164, formatPhone } from "@/utils/phone";
import { parseExcelFile } from "@/utils/excelUtils";
import type { CountryCode } from "libphonenumber-js";

interface RawRow {
  __row: number;
  [k: string]: string | number;
}

type RowStatus = "valid" | "invalid_phone" | "duplicate_in_file" | "duplicate_in_db" | "missing_required";

interface ParsedRow {
  rowIndex: number;
  rawName: string;
  rawPhone: string;
  rawEmail: string;
  rawCompany: string;
  rawTags: string;
  e164: string | null;
  status: RowStatus;
  errorReason?: string;
  duplicateOfId?: string;
}

const REQUIRED_FIELDS = ["phone"] as const;
const MAPPABLE_FIELDS = ["name", "phone", "email", "company", "tags"] as const;
type MappableField = (typeof MAPPABLE_FIELDS)[number];

const COUNTRY_OPTIONS: { code: CountryCode; label: string }[] = [
  { code: "PT", label: "Portugal (+351)" },
  { code: "BR", label: "Brasil (+55)" },
  { code: "ES", label: "Espanha (+34)" },
  { code: "FR", label: "França (+33)" },
  { code: "GB", label: "Reino Unido (+44)" },
  { code: "US", label: "EUA (+1)" },
  { code: "DE", label: "Alemanha (+49)" },
  { code: "IT", label: "Itália (+39)" },
  { code: "AO", label: "Angola (+244)" },
  { code: "MZ", label: "Moçambique (+258)" },
];

function autoDetectMapping(headers: string[]): Record<MappableField, string | null> {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_\-]+/g, "");
  const findHeader = (...candidates: string[]) =>
    headers.find((h) => candidates.some((c) => norm(h) === norm(c) || norm(h).includes(norm(c)))) ?? null;

  return {
    name: findHeader("name", "nome", "fullname", "contacto", "contact"),
    phone: findHeader("phone", "telefone", "telemovel", "celular", "mobile", "whatsapp", "tel"),
    email: findHeader("email", "mail", "correo"),
    company: findHeader("company", "empresa", "organizacao", "organization"),
    tags: findHeader("tags", "etiquetas", "labels"),
  };
}

export default function WhatsAppContactsImportPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<MappableField, string | null>>({
    name: null, phone: null, email: null, company: null, tags: null,
  });
  const [defaultCountry, setDefaultCountry] = useState<CountryCode>("PT");
  const [defaultTag, setDefaultTag] = useState<string>("whatsapp-import");
  const [parsing, setParsing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "map" | "preview" | "result">("upload");

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setParsing(true);
    setImportResult(null);
    setParsed(null);
    try {
      const buf = await file.arrayBuffer();
      let parsedHeaders: string[] = [];
      let parsedRows: RawRow[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = new TextDecoder().decode(buf);
        const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
        parsedHeaders = result.meta.fields ?? [];
        parsedRows = (result.data ?? []).map((r, i) => ({ __row: i + 2, ...r }));
      } else {
        const out = await parseExcelFile(buf);
        parsedHeaders = out.headers;
        parsedRows = out.rows.map((r, i) => ({ __row: i + 2, ...r }));
      }
      if (parsedHeaders.length === 0) {
        toast({ title: "Ficheiro vazio ou ilegível", variant: "destructive" });
        return;
      }
      setFileName(file.name);
      setHeaders(parsedHeaders);
      setRows(parsedRows);
      setMapping(autoDetectMapping(parsedHeaders));
      setActiveTab("map");
    } catch (e) {
      toast({ title: "Erro ao ler ficheiro", description: e instanceof Error ? e.message : "Verifique o formato.", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const validate = async () => {
    if (!currentWorkspace) return;
    if (!mapping.phone) {
      toast({ title: "Coluna de telefone obrigatória", description: "Mapeie a coluna que contém o número.", variant: "destructive" });
      return;
    }
    setValidating(true);
    setProgress(0);
    try {
      const seenPhones = new Set<string>();
      const candidate: ParsedRow[] = rows.map((r, idx) => {
        const rawPhone = String(r[mapping.phone!] ?? "").trim();
        const rawEmail = mapping.email ? String(r[mapping.email] ?? "").trim() : "";
        const rawName = mapping.name ? String(r[mapping.name] ?? "").trim() : "";
        const rawCompany = mapping.company ? String(r[mapping.company] ?? "").trim() : "";
        const rawTags = mapping.tags ? String(r[mapping.tags] ?? "").trim() : "";

        if (!rawPhone) {
          return { rowIndex: r.__row, rawName, rawPhone, rawEmail, rawCompany, rawTags, e164: null, status: "missing_required", errorReason: "Sem telefone" };
        }
        const e164 = toE164(rawPhone, defaultCountry);
        if (!e164) {
          return { rowIndex: r.__row, rawName, rawPhone, rawEmail, rawCompany, rawTags, e164: null, status: "invalid_phone", errorReason: "Telefone inválido" };
        }
        if (seenPhones.has(e164)) {
          return { rowIndex: r.__row, rawName, rawPhone, rawEmail, rawCompany, rawTags, e164, status: "duplicate_in_file", errorReason: "Repetido neste ficheiro" };
        }
        seenPhones.add(e164);
        return { rowIndex: r.__row, rawName, rawPhone, rawEmail, rawCompany, rawTags, e164, status: "valid" };
      });

      // dedupe contra DB em chunks
      const phonesToCheck = candidate.filter((c) => c.status === "valid").map((c) => c.e164!);
      const existing = new Map<string, string>();
      const chunkSize = 200;
      for (let i = 0; i < phonesToCheck.length; i += chunkSize) {
        const chunk = phonesToCheck.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("contacts")
          .select("id, phone")
          .eq("workspace_id", currentWorkspace.id)
          .is("deleted_at", null)
          .in("phone", chunk);
        if (error) throw error;
        (data ?? []).forEach((row) => {
          if (row.phone) existing.set(row.phone, row.id);
        });
        setProgress(Math.round(((i + chunk.length) / Math.max(phonesToCheck.length, 1)) * 100));
      }

      const final = candidate.map((c) => {
        if (c.status !== "valid" || !c.e164) return c;
        const dup = existing.get(c.e164);
        if (dup) {
          return { ...c, status: "duplicate_in_db" as const, errorReason: "Já existe", duplicateOfId: dup };
        }
        return c;
      });

      setParsed(final);
      setActiveTab("preview");
    } catch (e) {
      toast({ title: "Erro na validação", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setValidating(false);
      setProgress(0);
    }
  };

  const stats = useMemo(() => {
    if (!parsed) return null;
    return {
      total: parsed.length,
      valid: parsed.filter((p) => p.status === "valid").length,
      invalid: parsed.filter((p) => p.status === "invalid_phone").length,
      missing: parsed.filter((p) => p.status === "missing_required").length,
      dupFile: parsed.filter((p) => p.status === "duplicate_in_file").length,
      dupDb: parsed.filter((p) => p.status === "duplicate_in_db").length,
    };
  }, [parsed]);

  const runImport = async () => {
    if (!currentWorkspace || !user || !parsed) return;
    const validRows = parsed.filter((p) => p.status === "valid");
    if (validRows.length === 0) {
      toast({ title: "Nada para importar", description: "Não há contactos válidos.", variant: "destructive" });
      return;
    }
    setImporting(true);
    setProgress(0);
    let inserted = 0;
    try {
      const tag = defaultTag.trim();
      const tagsBase = tag ? [tag] : [];
      const chunkSize = 100;
      for (let i = 0; i < validRows.length; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);
        const payload = chunk.map((c) => {
          const extra = c.rawTags
            ? c.rawTags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
            : [];
          const tags = Array.from(new Set([...tagsBase, ...extra]));
          return {
            workspace_id: currentWorkspace.id,
            created_by: user.id,
            name: c.rawName || c.e164 || "Contacto WhatsApp",
            phone: c.e164,
            email: c.rawEmail || null,
            company: c.rawCompany || null,
            tags,
            source: "whatsapp_import",
          };
        });
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
        inserted += chunk.length;
        setProgress(Math.round((inserted / validRows.length) * 100));
      }
      const skipped = parsed.length - validRows.length;
      setImportResult({ inserted, skipped });
      setActiveTab("result");
      toast({ title: "Importação concluída", description: `${inserted} contactos criados.` });
    } catch (e) {
      toast({ title: "Erro na importação", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    const csv = "name,phone,email,company,tags\nJoão Silva,+351912345678,joao@exemplo.pt,Acme,cliente;vip\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-contactos-whatsapp.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrors = () => {
    if (!parsed) return;
    const errors = parsed.filter((p) => p.status !== "valid");
    const csv = Papa.unparse(errors.map((e) => ({
      linha: e.rowIndex,
      nome: e.rawName,
      telefone_original: e.rawPhone,
      email: e.rawEmail,
      empresa: e.rawCompany,
      e164: e.e164 ?? "",
      estado: e.status,
      motivo: e.errorReason ?? "",
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erros-importacao-whatsapp.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping({ name: null, phone: null, email: null, company: null, tags: null });
    setParsed(null);
    setImportResult(null);
    setActiveTab("upload");
  };

  return (
    <>
      <Helmet>
        <title>Importar Contactos WhatsApp · FastCRM</title>
        <meta name="description" content="Importação em massa de contactos via CSV ou Excel com validação E.164 e dedupe automático." />
      </Helmet>

      <div className="container py-6 space-y-6 max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Importar Contactos WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              CSV ou Excel → contactos com validação E.164 e dedupe por telefone.
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Modelo CSV
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="upload">1. Upload</TabsTrigger>
            <TabsTrigger value="map" disabled={headers.length === 0}>2. Mapeamento</TabsTrigger>
            <TabsTrigger value="preview" disabled={!parsed}>3. Pré-visualização</TabsTrigger>
            <TabsTrigger value="result" disabled={!importResult}>4. Resultado</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Carregar ficheiro</CardTitle>
                <CardDescription>Suporta .csv, .xlsx e .xls. Máx. 20MB.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  {parsing ? (
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-4 font-medium">
                        {isDragActive ? "Largue aqui o ficheiro…" : "Arraste o ficheiro ou clique para escolher"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">CSV, XLSX ou XLS</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle>Mapeamento de colunas</CardTitle>
                <CardDescription>
                  {fileName} · {rows.length} linhas detectadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MAPPABLE_FIELDS.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label className="capitalize">
                        {field === "phone" ? "Telefone" : field === "name" ? "Nome" : field === "email" ? "Email" : field === "company" ? "Empresa" : "Etiquetas"}
                        {REQUIRED_FIELDS.includes(field as never) && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Select
                        value={mapping[field] ?? "__none"}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v === "__none" ? null : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— ignorar —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>País por defeito (números sem prefixo)</Label>
                    <Select value={defaultCountry} onValueChange={(v) => setDefaultCountry(v as CountryCode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((o) => (
                          <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Etiqueta a aplicar</Label>
                    <Input value={defaultTag} onChange={(e) => setDefaultTag(e.target.value)} placeholder="whatsapp-import" />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={reset}>Cancelar</Button>
                  <Button onClick={validate} disabled={validating || !mapping.phone}>
                    {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Validar e pré-visualizar
                  </Button>
                </div>
                {validating && <Progress value={progress} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <StatCard label="Total" value={stats.total} icon={<Users className="h-4 w-4" />} />
                <StatCard label="Válidos" value={stats.valid} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
                <StatCard label="Duplicados (DB)" value={stats.dupDb} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
                <StatCard label="Duplicados (Ficheiro)" value={stats.dupFile} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
                <StatCard label="Inválidos" value={stats.invalid + stats.missing} icon={<XCircle className="h-4 w-4 text-destructive" />} />
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pré-visualização</CardTitle>
                  <CardDescription>Apenas os contactos válidos serão importados.</CardDescription>
                </div>
                <div className="flex gap-2">
                  {parsed && parsed.some((p) => p.status !== "valid") && (
                    <Button variant="outline" size="sm" onClick={downloadErrors}>
                      <Download className="h-4 w-4 mr-2" /> Exportar erros
                    </Button>
                  )}
                  <Button onClick={runImport} disabled={importing || !stats?.valid}>
                    {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Importar {stats?.valid ?? 0} contactos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {importing && <Progress value={progress} className="mb-4" />}
                <ScrollArea className="h-[480px] border rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone (E.164)</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(parsed ?? []).slice(0, 500).map((p) => (
                        <TableRow key={p.rowIndex}>
                          <TableCell className="text-muted-foreground">{p.rowIndex}</TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                          <TableCell>{p.rawName || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.e164 ? formatPhone(p.e164) : <span className="text-destructive">{p.rawPhone || "—"}</span>}
                          </TableCell>
                          <TableCell>{p.rawEmail || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>{p.rawCompany || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.errorReason ?? ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {parsed && parsed.length > 500 && (
                  <p className="text-xs text-muted-foreground mt-2">A mostrar as primeiras 500 linhas. Todas serão processadas.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result">
            {importResult && (
              <Alert>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertTitle>Importação concluída</AlertTitle>
                <AlertDescription>
                  <strong>{importResult.inserted}</strong> contactos criados ·{" "}
                  <strong>{importResult.skipped}</strong> ignorados (duplicados ou inválidos).
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2 mt-4">
              <Button onClick={reset}>Nova importação</Button>
              <Button variant="outline" asChild>
                <a href="/dashboard/contacts">Ver contactos</a>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; cls: string }> = {
    valid: { label: "Válido", cls: "bg-green-100 text-green-800 hover:bg-green-100" },
    invalid_phone: { label: "Telefone inválido", cls: "bg-destructive/10 text-destructive hover:bg-destructive/10" },
    missing_required: { label: "Sem telefone", cls: "bg-destructive/10 text-destructive hover:bg-destructive/10" },
    duplicate_in_file: { label: "Duplicado (ficheiro)", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    duplicate_in_db: { label: "Já existe", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  };
  const { label, cls } = map[status];
  return <Badge variant="secondary" className={cls}>{label}</Badge>;
}
