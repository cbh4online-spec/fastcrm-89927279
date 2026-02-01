import { useState, useRef, useEffect } from "react";
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
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { LifecycleStage } from "@/types/studentJourney";

interface SJCourse {
  id: string;
  name: string;
  tags?: string[];
}

interface ParsedProfile {
  full_name: string;
  email?: string;
  phone?: string;
  primary_interest?: string;
  interests?: string[];
  source?: string;
  notes?: string;
  lifecycle_stage?: LifecycleStage;
  // Contact matching info
  matchedContactId?: string;
  matchedContactName?: string;
  matchType?: "email" | "phone" | "name";
  // Course matching info
  matchedCourseId?: string;
  matchedCourseName?: string;
  courseMatchType?: "exact" | "partial" | "keyword" | "tag";
}

interface ImportResult {
  created: number;
  matched: number;
  enrollmentsCreated: number;
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
  const [courses, setCourses] = useState<SJCourse[]>([]);

  // Fetch courses for matching when dialog opens
  useEffect(() => {
    const fetchCourses = async () => {
      if (!currentWorkspace?.id || !open) return;
      const { data } = await supabase
        .from("sj_courses")
        .select("id, name, tags")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true);
      
      // Map to SJCourse interface, handling JSON tags
      const mappedCourses: SJCourse[] = (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        tags: Array.isArray(c.tags) ? (c.tags as string[]) : undefined,
      }));
      setCourses(mappedCourses);
    };
    fetchCourses();
  }, [currentWorkspace?.id, open]);

  // Normalize name for course matching: remove accents, lowercase, keep spaces
  const normalizeName = (name: string): string => {
    if (!name) return "";
    return name
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s]/g, " ")     // Replace symbols with space
      .replace(/\s+/g, " ")             // Collapse multiple spaces
      .trim();
  };

  // Find matching course for an interest
  const findMatchingCourse = (interest: string, coursesList: SJCourse[]): { course: SJCourse; matchType: "exact" | "partial" | "keyword" | "tag" } | null => {
    if (!interest || coursesList.length === 0) return null;

    const normalizedInterest = normalizeName(interest);
    const interestWords = normalizedInterest.split(/\s+/).filter((w) => w.length > 2);

    // 1. Exact match
    const exactMatch = coursesList.find((c) => normalizeName(c.name) === normalizedInterest);
    if (exactMatch) return { course: exactMatch, matchType: "exact" };

    // 2. Partial match (name contains interest or vice-versa)
    const partialMatch = coursesList.find((c) => {
      const courseName = normalizeName(c.name);
      return courseName.includes(normalizedInterest) || normalizedInterest.includes(courseName);
    });
    if (partialMatch) return { course: partialMatch, matchType: "partial" };

    // 3. Keyword match (50%+ words overlap)
    if (interestWords.length > 0) {
      const keywordMatch = coursesList.find((c) => {
        const courseName = normalizeName(c.name);
        const courseWords = courseName.split(/\s+/);
        const matches = interestWords.filter((w) => courseWords.some((cw) => cw.includes(w) || w.includes(cw)));
        return matches.length >= Math.ceil(interestWords.length * 0.5);
      });
      if (keywordMatch) return { course: keywordMatch, matchType: "keyword" };
    }

    // 4. Tag match
    const tagMatch = coursesList.find((c) =>
      c.tags?.some((tag) => {
        const normalizedTag = normalizeName(tag);
        return normalizedTag.includes(normalizedInterest) || normalizedInterest.includes(normalizedTag);
      })
    );
    if (tagMatch) return { course: tagMatch, matchType: "tag" };

    return null;
  };

  // Apply course matching to profiles
  const matchWithCourses = (profiles: ParsedProfile[], coursesList: SJCourse[]): ParsedProfile[] => {
    return profiles.map((profile) => {
      if (!profile.primary_interest) return profile;

      const match = findMatchingCourse(profile.primary_interest, coursesList);
      if (match) {
        return {
          ...profile,
          matchedCourseId: match.course.id,
          matchedCourseName: match.course.name,
          courseMatchType: match.matchType,
        };
      }
      return profile;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let data = await parseFile(file);

      // Apply course matching
      if (courses.length > 0) {
        data = matchWithCourses(data, courses);
      }

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

  // Normalize header: remove accents, lowercase, replace symbols with _
  const normalizeHeader = (header: string): string => {
    if (!header) return "";
    return header
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "_")      // Replace spaces/symbols with _
      .replace(/_+/g, "_")             // Collapse multiple underscores
      .replace(/^_|_$/g, "");          // Trim underscores
  };

  // Expected field keywords for header detection
  const EXPECTED_FIELDS = ["nome", "email", "telefone", "phone", "interesse", "origem", "source", "curso"];

  // Find the row containing headers (scans first 10 rows)
  const findHeaderRow = (sheet: XLSX.WorkSheet): number => {
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const maxScanRows = Math.min(10, range.e.r + 1);

    for (let row = 0; row < maxScanRows; row++) {
      let matchCount = 0;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddr];
        if (cell && cell.v) {
          const normalized = normalizeHeader(String(cell.v));
          if (EXPECTED_FIELDS.some((f) => normalized.includes(f))) {
            matchCount++;
          }
        }
      }
      // If we find at least 2 expected fields, it's likely the header row
      if (matchCount >= 2) {
        console.log(`[Excel Import] Header row detected at row ${row + 1}`);
        return row;
      }
    }
    console.log("[Excel Import] No header row detected, defaulting to row 1");
    return 0; // Default: first row
  };

  const parseFile = async (file: File): Promise<ParsedProfile[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Detect header row dynamically
      const headerRow = findHeaderRow(sheet);

      // Convert starting from the correct row (header: 1 gives array of arrays)
      const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        range: headerRow,
      }) as unknown[][];

      // First row are the headers, rest is data
      if (json.length < 2) {
        console.log("[Excel Import] Not enough rows after header detection");
        return [];
      }

      const headers = (json[0] as (string | undefined)[]).map((h) => normalizeHeader(h || ""));
      const dataRows = json.slice(1) as (string | number | undefined)[][];

      console.log("[Excel Import] Headers found:", headers);
      console.log("[Excel Import] Data rows:", dataRows.length);

      // Map data rows to objects using normalized headers
      const records = dataRows
        .filter((row) => row && row.some((cell) => cell !== undefined && cell !== null && cell !== ""))
        .map((row) => {
          const obj: Record<string, string> = {};
          headers.forEach((header, idx) => {
            if (header && row[idx] !== undefined && row[idx] !== null && row[idx] !== "") {
              obj[header] = String(row[idx]);
            }
          });
          return obj;
        })
        .filter((obj) => Object.keys(obj).length > 0);

      console.log("[Excel Import] Parsed records:", records.length, records[0]);
      return mapToProfiles(records);
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
      // Normalize all keys in the row for flexible matching
      const normalizedRow: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalizedRow[normalizeHeader(key)] = value;
      });

      const getName = () =>
        normalizedRow.full_name ||
        normalizedRow.nome ||
        normalizedRow.name ||
        normalizedRow.nome_completo ||
        `${normalizedRow.primeiro_nome || normalizedRow.first_name || ""} ${normalizedRow.apelido || normalizedRow.last_name || ""}`.trim();

      const getEmail = () =>
        normalizedRow.email || normalizedRow.e_mail;

      const getPhone = () =>
        normalizedRow.phone || normalizedRow.telefone || normalizedRow.telemovel;

      const getInterest = () =>
        normalizedRow.primary_interest ||
        normalizedRow.interesse ||
        normalizedRow.curso ||
        normalizedRow.formacao ||
        normalizedRow.area_de_interesse;

      const getSource = () =>
        normalizedRow.source || normalizedRow.origem || normalizedRow.canal;

      return {
        full_name: getName(),
        email: getEmail(),
        phone: getPhone(),
        primary_interest: getInterest(),
        source: getSource(),
        notes: normalizedRow.notes || normalizedRow.notas || normalizedRow.observacoes,
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
    const result: ImportResult = { created: 0, matched: 0, enrollmentsCreated: 0, errors: [] };

    for (let i = 0; i < toImport.length; i++) {
      const profile = toImport[i];

      try {
        const { data: createdProfile, error } = await supabase.from("sj_profiles").insert({
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
        }).select().single();

        if (error) throw error;

        result.created++;
        if (profile.matchedContactId) result.matched++;

        // Create enrollment if course was matched
        if (createdProfile && profile.matchedCourseId) {
          const { error: enrollError } = await supabase.from("sj_enrollments").insert({
            workspace_id: currentWorkspace.id,
            profile_id: createdProfile.id,
            course_id: profile.matchedCourseId,
            status: "interested",
            payment_status: "unpaid",
            source: "import",
          });

          if (!enrollError) {
            result.enrollmentsCreated++;
          }
        }
      } catch (err) {
        result.errors.push(`${profile.full_name}: ${err instanceof Error ? err.message : "Erro"}`);
      }

      setImportProgress(((i + 1) / toImport.length) * 100);
    }

    setImportResult(result);
    setStep("complete");
    queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["sj-enrollments"] });
  };

  const downloadTemplate = () => {
    const template = [
      {
        nome: "João Silva",
        email: "joao@exemplo.pt",
        telefone: "912345678",
        formacao: "Curso Básico",
        origem: "Website",
        notas: "Interessado na formação básica",
      },
      {
        nome: "Maria Santos",
        email: "maria@exemplo.pt",
        telefone: "923456789",
        formacao: "Formação Avançada",
        origem: "Indicação",
        notas: "",
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
                    <th className="p-2 text-left">Formação</th>
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
                      <td className="p-2">
                        {profile.matchedCourseId ? (
                          <Badge
                            variant="outline"
                            className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200"
                          >
                            <GraduationCap className="h-3 w-3" />
                            {profile.matchedCourseName}
                          </Badge>
                        ) : profile.primary_interest ? (
                          <span className="text-muted-foreground text-xs">{profile.primary_interest}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
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

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {importResult.created}
                </p>
                <p className="text-sm text-muted-foreground">Perfis criados</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {importResult.enrollmentsCreated}
                </p>
                <p className="text-sm text-muted-foreground">
                  Inscrições criadas
                </p>
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
