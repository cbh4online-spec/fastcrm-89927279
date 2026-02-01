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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Link2,
  Loader2,
  Download,
  GraduationCap,
  User,
  Mail,
  Phone,
  Globe,
  FileText,
  XCircle,
  ArrowRight,
  Hash,
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

interface MatchedCourse {
  courseId: string;
  courseName: string;
  matchType: "exact" | "partial" | "keyword" | "tag";
  sourceColumn: string;
}

interface ParsedProfile {
  full_name: string;
  email?: string;
  phone?: string;
  client_number?: string;
  primary_interest?: string;
  interests?: string[];
  source?: string;
  notes?: string;
  lifecycle_stage?: LifecycleStage;
  // Contact matching info
  matchedContactId?: string;
  matchedContactName?: string;
  matchType?: "email" | "phone" | "client_number" | "name";
  // Course matching info - now supports multiple courses
  matchedCourses: MatchedCourse[];
}

interface ImportResult {
  created: number;
  matched: number;
  enrollmentsCreated: number;
  errors: string[];
}

// Column mapping types
type MappingFieldType = "nome" | "email" | "telefone" | "n_cliente" | "origem" | "notas" | "curso" | "ignorar";

interface DetectedColumn {
  originalName: string;
  normalizedName: string;
  mappedTo: MappingFieldType;
  isSelected: boolean;
  sampleValues: string[];
  isCourseColumn: boolean;
}

// Mapping field options
const MAPPING_FIELDS: { value: MappingFieldType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "nome", label: "Nome", icon: User },
  { value: "email", label: "Email", icon: Mail },
  { value: "telefone", label: "Telefone", icon: Phone },
  { value: "n_cliente", label: "Nº Cliente", icon: Hash },
  { value: "curso", label: "Formação/Curso", icon: GraduationCap },
  { value: "origem", label: "Origem/Fonte", icon: Globe },
  { value: "notas", label: "Notas", icon: FileText },
  { value: "ignorar", label: "Ignorar coluna", icon: XCircle },
];

// Course column detection patterns
const COURSE_COLUMN_PATTERNS = [
  "curso",
  "formacao",
  "formação",
  "course",
  "training",
  "modulo",
  "módulo",
  "nivel",
  "nível",
  "workshop",
];

// Field mapping patterns for auto-detection
const FIELD_PATTERNS: Record<MappingFieldType, string[]> = {
  nome: ["nome", "name", "full_name", "nome_completo", "primeiro_nome", "first_name", "apelido", "last_name"],
  email: ["email", "e_mail", "mail", "correio"],
  telefone: ["telefone", "phone", "telemovel", "mobile", "contacto", "celular"],
  n_cliente: ["n_cliente", "cliente", "client", "num_cliente", "numero_cliente", "cliente_numero", "client_number", "cod_cliente", "codigo_cliente"],
  origem: ["origem", "source", "canal", "proveniencia", "referencia"],
  notas: ["notas", "notes", "observacoes", "comentarios", "obs"],
  curso: COURSE_COLUMN_PATTERNS,
  ignorar: [],
};

export function ImportProfilesDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "complete">("upload");
  const [parsedData, setParsedData] = useState<ParsedProfile[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [autoMatch, setAutoMatch] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [courses, setCourses] = useState<SJCourse[]>([]);

  // New states for column mapping
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);

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
      .replace(/[^a-z0-9\s]/g, " ") // Replace symbols with space
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim();
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
      .replace(/[^a-z0-9]/g, "_") // Replace spaces/symbols with _
      .replace(/_+/g, "_") // Collapse multiple underscores
      .replace(/^_|_$/g, ""); // Trim underscores
  };

  // Auto-detect what field a column maps to based on its name
  const autoDetectMapping = (header: string): MappingFieldType => {
    const normalized = normalizeHeader(header);
    
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
      if (patterns.some((p) => normalized.includes(p))) {
        return field as MappingFieldType;
      }
    }
    
    return "ignorar";
  };

  // Check if a header name suggests it's a course column
  const isCourseColumnByName = (header: string): boolean => {
    const normalized = normalizeHeader(header);
    return COURSE_COLUMN_PATTERNS.some((p) => normalized.includes(p));
  };

  // Find matching course for a value
  const findMatchingCourse = (
    value: string,
    coursesList: SJCourse[]
  ): { course: SJCourse; matchType: "exact" | "partial" | "keyword" | "tag" } | null => {
    if (!value || coursesList.length === 0) return null;

    const normalizedValue = normalizeName(value);
    if (!normalizedValue) return null;

    const valueWords = normalizedValue.split(/\s+/).filter((w) => w.length > 2);

    // 1. Exact match
    const exactMatch = coursesList.find((c) => normalizeName(c.name) === normalizedValue);
    if (exactMatch) return { course: exactMatch, matchType: "exact" };

    // 2. Partial match (name contains value or vice-versa)
    const partialMatch = coursesList.find((c) => {
      const courseName = normalizeName(c.name);
      return courseName.includes(normalizedValue) || normalizedValue.includes(courseName);
    });
    if (partialMatch) return { course: partialMatch, matchType: "partial" };

    // 3. Keyword match (50%+ words overlap)
    if (valueWords.length > 0) {
      const keywordMatch = coursesList.find((c) => {
        const courseName = normalizeName(c.name);
        const courseWords = courseName.split(/\s+/);
        const matches = valueWords.filter((w) =>
          courseWords.some((cw) => cw.includes(w) || w.includes(cw))
        );
        return matches.length >= Math.ceil(valueWords.length * 0.5);
      });
      if (keywordMatch) return { course: keywordMatch, matchType: "keyword" };
    }

    // 4. Tag match
    const tagMatch = coursesList.find((c) =>
      c.tags?.some((tag) => {
        const normalizedTag = normalizeName(tag);
        return normalizedTag.includes(normalizedValue) || normalizedValue.includes(normalizedTag);
      })
    );
    if (tagMatch) return { course: tagMatch, matchType: "tag" };

    return null;
  };

  // Check if column has course matches in data
  const hasCourseMatches = (data: Record<string, string>[], header: string): boolean => {
    if (courses.length === 0) return false;
    
    const nonEmptyValues = data.filter((row) => row[header]?.trim());
    if (nonEmptyValues.length === 0) return false;

    const matchCount = nonEmptyValues.filter((row) =>
      findMatchingCourse(row[header], courses)
    ).length;

    return matchCount / nonEmptyValues.length >= 0.2;
  };

  // Get sample values from a column
  const getSampleValues = (data: Record<string, string>[], header: string, count: number = 3): string[] => {
    return data
      .map((row) => row[header])
      .filter((v) => v?.trim())
      .slice(0, count);
  };

  // Expected field keywords for header detection
  const EXPECTED_FIELDS = ["nome", "email", "telefone", "phone", "interesse", "origem", "source", "curso", "formacao"];

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data, headers } = await extractRawData(file);
      
      // Detect and configure columns
      const columns: DetectedColumn[] = headers.map((header) => {
        const normalized = normalizeHeader(header);
        const autoMapping = autoDetectMapping(header);
        const isCourse = isCourseColumnByName(header) || hasCourseMatches(data, header);
        
        return {
          originalName: header,
          normalizedName: normalized,
          mappedTo: isCourse ? "curso" : autoMapping,
          isSelected: autoMapping !== "ignorar" || isCourse,
          sampleValues: getSampleValues(data, header, 3),
          isCourseColumn: isCourse,
        };
      });

      setDetectedColumns(columns);
      setRawData(data);
      setOriginalHeaders(headers);
      setStep("mapping");
      
      console.log("[Excel Import] Detected columns:", columns);
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Erro ao processar ficheiro. Verifique o formato.");
    }
  };

  // Extract raw data from file (returns data and original headers)
  const extractRawData = async (file: File): Promise<{ data: Record<string, string>[]; headers: string[] }> => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Detect header row dynamically
      const headerRow = findHeaderRow(sheet);

      // Convert starting from the correct row
      const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        range: headerRow,
      }) as unknown[][];

      if (json.length < 2) {
        return { data: [], headers: [] };
      }

      // Keep original headers
      const headers = (json[0] as (string | undefined)[])
        .map((h) => (h ? String(h).trim() : ""))
        .filter((h) => h);
      
      const dataRows = json.slice(1) as (string | number | undefined)[][];

      // Map data rows to objects using original headers
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

      return { data: records, headers };
    } else if (ext === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const headers = results.meta.fields || [];
            resolve({ data: results.data, headers });
          },
          error: reject,
        });
      });
    }

    throw new Error("Formato não suportado");
  };

  // Toggle column selection
  const toggleColumn = (index: number, selected: boolean) => {
    setDetectedColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, isSelected: selected } : col))
    );
  };

  // Update column mapping
  const updateMapping = (index: number, mappedTo: MappingFieldType) => {
    setDetectedColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, mappedTo } : col))
    );
  };

  // Toggle all columns
  const toggleAllColumns = (selected: boolean) => {
    setDetectedColumns((prev) => prev.map((col) => ({ ...col, isSelected: selected })));
  };

  // Proceed from mapping to preview
  const proceedToPreview = async () => {
    const profiles = mapDataWithMapping(rawData, detectedColumns);
    setParsedData(profiles);
    setSelectedRows(new Set(profiles.map((_, i) => i)));
    setStep("preview");

    if (autoMatch && profiles.length > 0) {
      await matchWithContacts(profiles);
    }
  };

  // Map data using user-defined column mapping
  const mapDataWithMapping = (data: Record<string, string>[], columns: DetectedColumn[]): ParsedProfile[] => {
    const selectedColumns = columns.filter((c) => c.isSelected);
    
    return data
      .map((row) => {
        const profile: ParsedProfile = {
          full_name: "",
          matchedCourses: [],
          lifecycle_stage: "lead" as LifecycleStage,
        };

        for (const col of selectedColumns) {
          const value = row[col.originalName]?.trim();
          if (!value) continue;

          switch (col.mappedTo) {
            case "nome":
              profile.full_name = profile.full_name ? `${profile.full_name} ${value}` : value;
              break;
            case "email":
              profile.email = value;
              break;
            case "telefone":
              profile.phone = value;
              break;
            case "n_cliente":
              profile.client_number = value;
              break;
            case "origem":
              profile.source = value;
              break;
            case "notas":
              profile.notes = profile.notes ? `${profile.notes}; ${value}` : value;
              break;
            case "curso":
              // Try to match with existing courses
              const match = findMatchingCourse(value, courses);
              if (match) {
                // Avoid duplicates
                if (!profile.matchedCourses.some((mc) => mc.courseId === match.course.id)) {
                  profile.matchedCourses.push({
                    courseId: match.course.id,
                    courseName: match.course.name,
                    matchType: match.matchType,
                    sourceColumn: col.originalName,
                  });
                }
              } else {
                // Store as primary interest if no match
                profile.primary_interest = profile.primary_interest
                  ? `${profile.primary_interest}, ${value}`
                  : value;
              }
              break;
          }
        }

        return profile;
      })
      .filter((p) => p.full_name);
  };

  const matchWithContacts = async (profiles: ParsedProfile[]) => {
    if (!currentWorkspace?.id) return;
    setIsMatching(true);

    try {
      // Get all contacts for matching (include client_number)
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, email, phone, client_number")
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

        // Try client_number match
        if (profile.client_number) {
          const clientMatch = contacts.find(
            (c) => c.client_number?.toLowerCase() === profile.client_number?.toLowerCase()
          );
          if (clientMatch) {
            return {
              ...profile,
              matchedContactId: clientMatch.id,
              matchedContactName: clientMatch.name,
              matchType: "client_number" as const,
            };
          }
        }

        // Try name match (fuzzy)
        const nameMatch = contacts.find(
          (c) => c.name.toLowerCase().trim() === profile.full_name.toLowerCase().trim()
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
        const { data: createdProfile, error } = await supabase
          .from("sj_profiles")
          .insert({
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
          })
          .select()
          .single();

        if (error) throw error;

        result.created++;
        if (profile.matchedContactId) {
          result.matched++;
          
          // Update contact's client_number if profile has one and contact doesn't
          if (profile.client_number) {
            const { data: existingContact } = await supabase
              .from("contacts")
              .select("client_number")
              .eq("id", profile.matchedContactId)
              .single();
            
            if (existingContact && !existingContact.client_number) {
              await supabase
                .from("contacts")
                .update({ client_number: profile.client_number })
                .eq("id", profile.matchedContactId);
            }
          }
        }

        // Create enrollments for ALL matched courses
        if (createdProfile && profile.matchedCourses.length > 0) {
          for (const matchedCourse of profile.matchedCourses) {
            const { error: enrollError } = await supabase.from("sj_enrollments").insert({
              workspace_id: currentWorkspace.id,
              profile_id: createdProfile.id,
              course_id: matchedCourse.courseId,
              status: "interested",
              payment_status: "unpaid",
              source: "import",
            });

            if (!enrollError) {
              result.enrollmentsCreated++;
            }
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
        curso_1: "Formação Básica",
        curso_2: "Workshop Avançado",
        origem: "Website",
        notas: "Interessado em múltiplas formações",
      },
      {
        nome: "Maria Santos",
        email: "maria@exemplo.pt",
        telefone: "923456789",
        curso_1: "Formação Avançada",
        curso_2: "",
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
    setDetectedColumns([]);
    setRawData([]);
    setOriginalHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goBackToUpload = () => {
    setStep("upload");
    setDetectedColumns([]);
    setRawData([]);
    setOriginalHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goBackToMapping = () => {
    setStep("mapping");
    setParsedData([]);
    setSelectedRows(new Set());
  };

  const matchedCount = parsedData.filter((p) => p.matchedContactId).length;
  const totalCoursesMatched = parsedData.reduce((acc, p) => acc + p.matchedCourses.length, 0);
  const selectedColumnsCount = detectedColumns.filter((c) => c.isSelected).length;
  const courseColumnsCount = detectedColumns.filter((c) => c.mappedTo === "curso").length;

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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Perfis de Alunos
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Importe perfis a partir de ficheiros Excel ou CSV."}
            {step === "mapping" && "Verifique o mapeamento das colunas e seleccione quais importar."}
            {step === "preview" && "Reveja os perfis antes de importar."}
            {step === "importing" && "A processar importação..."}
            {step === "complete" && "Importação concluída!"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {(step === "mapping" || step === "preview") && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-3">
            <span className={step === "mapping" ? "text-primary font-medium" : ""}>
              1. Mapear Colunas
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className={step === "preview" ? "text-primary font-medium" : ""}>
              2. Rever Perfis
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-muted-foreground">3. Importar</span>
          </div>
        )}

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

            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Descarregar Template
            </Button>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {detectedColumns.length} colunas detectadas
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedColumnsCount} seleccionadas
                  {courseColumnsCount > 0 && ` • ${courseColumnsCount} identificadas como formação`}
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                {rawData.length} linhas
              </Badge>
            </div>

            <ScrollArea className="h-[350px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 text-left w-10">
                      <Checkbox
                        checked={detectedColumns.every((c) => c.isSelected)}
                        onCheckedChange={(c) => toggleAllColumns(!!c)}
                      />
                    </th>
                    <th className="p-2 text-left min-w-[150px]">Coluna no Excel</th>
                    <th className="p-2 text-left min-w-[180px]">Exemplos</th>
                    <th className="p-2 text-left min-w-[160px]">Mapear para</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedColumns.map((col, idx) => {
                    const FieldIcon = MAPPING_FIELDS.find((f) => f.value === col.mappedTo)?.icon || XCircle;
                    return (
                      <tr
                        key={idx}
                        className={`border-t hover:bg-muted/30 ${!col.isSelected ? "opacity-50" : ""}`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={col.isSelected}
                            onCheckedChange={(c) => toggleColumn(idx, !!c)}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate max-w-[120px]" title={col.originalName}>
                              {col.originalName}
                            </span>
                            {col.isCourseColumn && (
                              <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                                <GraduationCap className="h-3 w-3" />
                                Formação
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <span
                            className="text-xs text-muted-foreground block truncate max-w-[170px]"
                            title={col.sampleValues.join(", ")}
                          >
                            {col.sampleValues.length > 0
                              ? col.sampleValues.join(", ")
                              : "(vazio)"}
                          </span>
                        </td>
                        <td className="p-2">
                          <Select
                            value={col.mappedTo}
                            onValueChange={(v) => updateMapping(idx, v as MappingFieldType)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[140px]">
                              <div className="flex items-center gap-1.5">
                                <FieldIcon className="h-3 w-3 shrink-0" />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {MAPPING_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  <div className="flex items-center gap-2">
                                    <field.icon className="h-3 w-3" />
                                    {field.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p>
                <strong>Dica:</strong> As colunas mapeadas como "Formação/Curso" serão automaticamente
                associadas a cursos existentes. Múltiplas colunas podem ser mapeadas para o mesmo campo.
              </p>
            </div>
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
                  {totalCoursesMatched > 0 && ` • ${totalCoursesMatched} cursos identificados`}
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
                    <th className="p-2 text-left">Formações</th>
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
                      <td className="p-2 text-muted-foreground">{profile.email || "-"}</td>
                      <td className="p-2">
                        {profile.matchedCourses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {profile.matchedCourses.map((mc, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200"
                              >
                                <GraduationCap className="h-3 w-3" />
                                {mc.courseName}
                              </Badge>
                            ))}
                          </div>
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
                <p className="text-2xl font-bold text-primary">{importResult.created}</p>
                <p className="text-sm text-muted-foreground">Perfis criados</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{importResult.enrollmentsCreated}</p>
                <p className="text-sm text-muted-foreground">Inscrições criadas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{importResult.matched}</p>
                <p className="text-sm text-muted-foreground">Ligados ao CRM</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">{importResult.errors.length} erros</span>
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
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={goBackToUpload}>
                Voltar
              </Button>
              <Button onClick={proceedToPreview} disabled={selectedColumnsCount === 0}>
                Continuar para Preview
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={goBackToMapping}>
                Voltar ao Mapeamento
              </Button>
              <Button onClick={handleImport} disabled={selectedRows.size === 0 || isMatching}>
                Importar {selectedRows.size} perfis
              </Button>
            </>
          )}
          {step === "complete" && <Button onClick={() => setOpen(false)}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
