import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Link2,
  Loader2,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { LifecycleStage } from "@/types/studentJourney";

interface ParsedProfile {
  full_name: string;
  email?: string;
  phone?: string;
  primary_interest?: string;
  interests?: string[];
  source?: string;
  notes?: string;
  lifecycle_stage?: LifecycleStage;
  // Matching info
  matchedContactId?: string;
  matchedContactName?: string;
  matchType?: "email" | "phone" | "name";
}

interface ImportResult {
  created: number;
  matched: number;
  errors: string[];
}

export function ImportProfilesDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const [parsedData, setParsedData] = useState<ParsedProfile[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [autoMatch, setAutoMatch] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseFile(file);
      setParsedData(data);
      setSelectedRows(new Set(data.map((_, i) => i)));
      setStep("preview");

      if (autoMatch) {
        await matchWithContacts(data);
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Erro ao processar ficheiro. Verifique o formato.");
    }
  };

  const parseFile = async (file: File): Promise<ParsedProfile[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
      return mapToProfiles(json);
    } else if (ext === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(mapToProfiles(results.data)),
          error: reject,
        });
      });
    }

    throw new Error("Formato não suportado");
  };

  const mapToProfiles = (data: Record<string, string>[]): ParsedProfile[] => {
    return data.map((row) => {
      // Flexible column mapping
      const getName = () =>
        row.full_name ||
        row.nome ||
        row.name ||
        row.Nome ||
        row["Nome Completo"] ||
        `${row.first_name || row.primeiro_nome || ""} ${row.last_name || row.apelido || ""}`.trim();

      const getEmail = () =>
        row.email || row.Email || row.EMAIL || row.e_mail || row["E-mail"];

      const getPhone = () =>
        row.phone || row.telefone || row.Phone || row.Telefone || row.telemovel || row.Telemóvel;

      const getInterest = () =>
        row.primary_interest ||
        row.interesse ||
        row.curso ||
        row.formacao ||
        row.Interesse ||
        row.Curso ||
        row["Área de Interesse"];

      const getSource = () =>
        row.source || row.origem || row.Source || row.Origem || row.canal;

      return {
        full_name: getName(),
        email: getEmail(),
        phone: getPhone(),
        primary_interest: getInterest(),
        source: getSource(),
        notes: row.notes || row.notas || row.observacoes || row.Notas,
        lifecycle_stage: "lead" as LifecycleStage,
      };
    }).filter((p) => p.full_name);
  };

  const matchWithContacts = async (profiles: ParsedProfile[]) => {
    if (!currentWorkspace?.id) return;
    setIsMatching(true);

    try {
      // Get all contacts for matching
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, email, phone")
        .eq("workspace_id", currentWorkspace.id);

      if (!contacts) return;

      const updatedProfiles = profiles.map((profile) => {
        // Try email match first
        if (profile.email) {
          const emailMatch = contacts.find(
            (c) => c.email?.toLowerCase() === profile.email?.toLowerCase()
          );
          if (emailMatch) {
            return {
              ...profile,
              matchedContactId: emailMatch.id,
              matchedContactName: emailMatch.name,
              matchType: "email" as const,
            };
          }
        }

        // Try phone match
        if (profile.phone) {
          const normalizedPhone = profile.phone.replace(/\D/g, "");
          const phoneMatch = contacts.find(
            (c) => c.phone?.replace(/\D/g, "") === normalizedPhone
          );
          if (phoneMatch) {
            return {
              ...profile,
              matchedContactId: phoneMatch.id,
              matchedContactName: phoneMatch.name,
              matchType: "phone" as const,
            };
          }
        }

        // Try name match (fuzzy)
        const nameMatch = contacts.find(
          (c) =>
            c.name.toLowerCase().trim() === profile.full_name.toLowerCase().trim()
        );
        if (nameMatch) {
          return {
            ...profile,
            matchedContactId: nameMatch.id,
            matchedContactName: nameMatch.name,
            matchType: "name" as const,
          };
        }

        return profile;
      });

      setParsedData(updatedProfiles);
    } finally {
      setIsMatching(false);
    }
  };

  const handleImport = async () => {
    if (!currentWorkspace?.id) return;

    setStep("importing");
    setImportProgress(0);

    const toImport = parsedData.filter((_, i) => selectedRows.has(i));
    const result: ImportResult = { created: 0, matched: 0, errors: [] };

    for (let i = 0; i < toImport.length; i++) {
      const profile = toImport[i];

      try {
        const { error } = await supabase.from("sj_profiles").insert({
          workspace_id: currentWorkspace.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          primary_interest: profile.primary_interest,
          interests: profile.interests,
          source: profile.source,
          notes: profile.notes,
          lifecycle_stage: profile.lifecycle_stage || "lead",
          contact_id: profile.matchedContactId,
        });

        if (error) throw error;

        result.created++;
        if (profile.matchedContactId) result.matched++;
      } catch (err) {
        result.errors.push(`${profile.full_name}: ${err instanceof Error ? err.message : "Erro"}`);
      }

      setImportProgress(((i + 1) / toImport.length) * 100);
    }

    setImportResult(result);
    setStep("complete");
    queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
  };

  const downloadTemplate = () => {
    const template = [
      {
        nome: "João Silva",
        email: "joao@exemplo.pt",
        telefone: "912345678",
        interesse: "Desenvolvimento Web",
        origem: "Website",
        notas: "Interessado no curso de React",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_importacao_alunos.xlsx");
  };

  const resetDialog = () => {
    setStep("upload");
    setParsedData([]);
    setSelectedRows(new Set());
    setImportProgress(0);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const matchedCount = parsedData.filter((p) => p.matchedContactId).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Perfis de Alunos
          </DialogTitle>
          <DialogDescription>
            Importe perfis a partir de ficheiros Excel ou CSV.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Clique para selecionar ficheiro</p>
              <p className="text-sm text-muted-foreground mt-1">
                Suporta .xlsx, .xls e .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-match"
                checked={autoMatch}
                onCheckedChange={(c) => setAutoMatch(!!c)}
              />
              <label htmlFor="auto-match" className="text-sm cursor-pointer">
                Fazer matching automático com contactos CRM (email → telefone → nome)
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Descarregar Template
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {parsedData.length} perfis encontrados
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedRows.size} selecionados para importar
                </p>
              </div>
              {isMatching ? (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  A fazer matching...
                </Badge>
              ) : matchedCount > 0 ? (
                <Badge variant="secondary" className="gap-1">
                  <Link2 className="h-3 w-3" />
                  {matchedCount} matches encontrados
                </Badge>
              ) : null}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-8">
                      <Checkbox
                        checked={selectedRows.size === parsedData.length}
                        onCheckedChange={(c) => {
                          if (c) {
                            setSelectedRows(new Set(parsedData.map((_, i) => i)));
                          } else {
                            setSelectedRows(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Interesse</th>
                    <th className="p-2 text-left">Match CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((profile, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/30">
                      <td className="p-2">
                        <Checkbox
                          checked={selectedRows.has(idx)}
                          onCheckedChange={(c) => {
                            const newSet = new Set(selectedRows);
                            if (c) {
                              newSet.add(idx);
                            } else {
                              newSet.delete(idx);
                            }
                            setSelectedRows(newSet);
                          }}
                        />
                      </td>
                      <td className="p-2 font-medium">{profile.full_name}</td>
                      <td className="p-2 text-muted-foreground">
                        {profile.email || "-"}
                      </td>
                      <td className="p-2">{profile.primary_interest || "-"}</td>
                      <td className="p-2">
                        {profile.matchedContactId ? (
                          <Badge
                            variant="outline"
                            className="gap-1 text-xs bg-green-50 text-green-700 border-green-200"
                          >
                            <Link2 className="h-3 w-3" />
                            {profile.matchType}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-3" />
              <p className="font-medium">A importar perfis...</p>
              <p className="text-sm text-muted-foreground">
                {Math.round(importProgress)}% concluído
              </p>
            </div>
            <Progress value={importProgress} />
          </div>
        )}

        {step === "complete" && importResult && (
          <div className="py-6 space-y-4">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-lg">Importação concluída!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {importResult.created}
                </p>
                <p className="text-sm text-muted-foreground">Perfis criados</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {importResult.matched}
                </p>
                <p className="text-sm text-muted-foreground">
                  Ligados ao CRM
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {importResult.errors.length} erros
                  </span>
                </div>
                <ScrollArea className="h-20">
                  <ul className="text-xs space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedRows.size === 0 || isMatching}
              >
                Importar {selectedRows.size} perfis
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
