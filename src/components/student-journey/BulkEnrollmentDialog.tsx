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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  User,
  Download,
  UserPlus,
  ClipboardList,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Course ID mapping based on column names
const COURSE_COLUMN_MAPPING: Record<string, string> = {
  iniciacao: "f0a7d028-3a69-4905-8818-00e29ea3ab6e",
  basica: "abff51ab-a3e5-4fc7-8095-115ff0a60c37",
  avancada: "d177873a-9680-4d39-a945-97c44cba437f",
  tricologia: "cc67fa71-ae30-426b-983b-1de997ac896a",
  aromaterapia: "01d4f74e-ab13-4db3-b6f7-d4927ea296b8",
};

// Expected header fields for dynamic header detection
const EXPECTED_HEADER_FIELDS = ["nome", "iniciacao", "basica", "avancada", "tricologia", "aromaterapia"];

// Name column patterns for robust matching
const NAME_COLUMN_PATTERNS = ["nome", "name", "cliente", "client", "razaosocial"];

interface ExcelRow {
  name: string;
  courses: { columnName: string; courseId: string; courseName: string }[];
}

interface PreviewData {
  rows: ExcelRow[];
  detectedCourses: { columnName: string; courseId: string; courseName: string; count: number }[];
  totalEnrollments: number;
}

interface ProcessingResult {
  contactsProcessed: number;
  contactsCreated: number;
  profilesCreated: number;
  profilesExisting: number;
  enrollmentsCreated: number;
  enrollmentsSkipped: number;
}

interface Contact {
  id: string;
  name: string;
}

interface SJProfile {
  id: string;
  contact_id: string | null;
}

export function BulkEnrollmentDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);

  // Fetch courses when dialog opens
  useEffect(() => {
    const fetchCourses = async () => {
      if (!currentWorkspace?.id || !open) return;
      const { data } = await supabase
        .from("sj_courses")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true);

      setCourses(data || []);
    };
    fetchCourses();
  }, [currentWorkspace?.id, open]);

  // Normalize column name for matching
  const normalizeColumnName = (name: string): string => {
    return name
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric
  };

  // Find the header row by scanning for expected fields
  const findHeaderRow = (sheet: XLSX.WorkSheet): number => {
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const maxScanRows = Math.min(10, range.e.r + 1);

    for (let row = 0; row < maxScanRows; row++) {
      let matchCount = 0;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddr];
        if (cell && cell.v) {
          const normalized = normalizeColumnName(String(cell.v));
          if (EXPECTED_HEADER_FIELDS.some((f) => normalized.includes(f))) {
            matchCount++;
          }
        }
      }
      // If we find at least 2 expected fields, this is the header row
      if (matchCount >= 2) {
        return row;
      }
    }
    return 0; // Default: first row
  };

  // Find name column with robust pattern matching
  const findNameColumn = (headers: string[]): string | null => {
    const normalizedHeaders = headers.map((h) => ({
      original: h,
      normalized: normalizeColumnName(h),
    }));

    // Try exact match first
    for (const pattern of NAME_COLUMN_PATTERNS) {
      const match = normalizedHeaders.find((h) => h.normalized === pattern);
      if (match) return match.original;
    }

    // Try partial match (contains)
    for (const pattern of NAME_COLUMN_PATTERNS) {
      const match = normalizedHeaders.find((h) => h.normalized.includes(pattern));
      if (match) return match.original;
    }

    return null;
  };

  // Match column name to course
  const matchColumnToCourse = (columnName: string): { courseId: string; courseName: string } | null => {
    const normalized = normalizeColumnName(columnName);
    
    for (const [key, courseId] of Object.entries(COURSE_COLUMN_MAPPING)) {
      if (normalized.includes(key)) {
        const course = courses.find((c) => c.id === courseId);
        if (course) {
          return { courseId, courseName: course.name };
        }
      }
    }
    return null;
  };

  // Parse Excel file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Detect header row (scan first 10 rows for expected fields)
      const headerRow = findHeaderRow(sheet);
      console.log(`Header row detected at index: ${headerRow}`);
      
      // Convert to JSON starting from the detected header row
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
        defval: "",
        range: headerRow,
      });
      
      if (json.length === 0) {
        toast.error("Ficheiro vazio ou sem dados válidos");
        return;
      }

      // Get headers from first row of parsed data
      const headers = Object.keys(json[0]);
      console.log("Detected headers:", headers);
      
      // Find "Nome" column with robust matching
      const nameColumn = findNameColumn(headers);
      
      if (!nameColumn) {
        toast.error("Coluna 'Nome' não encontrada no ficheiro. Verifique se o ficheiro contém uma coluna com o nome dos clientes.");
        return;
      }
      
      console.log(`Name column found: "${nameColumn}"`);

      // Detect course columns
      const detectedCourses: { columnName: string; courseId: string; courseName: string; count: number }[] = [];
      
      headers.forEach((header) => {
        const match = matchColumnToCourse(header);
        if (match) {
          // Count how many rows have "x" in this column
          const count = json.filter((row) => {
            const value = String(row[header] || "").trim().toLowerCase();
            return value === "x" || value === "yes" || value === "sim" || value === "1";
          }).length;
          
          if (count > 0) {
            detectedCourses.push({
              columnName: header,
              courseId: match.courseId,
              courseName: match.courseName,
              count,
            });
          }
        }
      });

      if (detectedCourses.length === 0) {
        toast.error("Nenhuma coluna de formação detectada (Iniciação, Básica, Avançada, Tricologia, Aromaterapia)");
        return;
      }

      // Build preview rows
      const rows: ExcelRow[] = [];
      let totalEnrollments = 0;

      json.forEach((row) => {
        const name = String(row[nameColumn] || "").trim();
        if (!name) return;

        const rowCourses: ExcelRow["courses"] = [];
        
        detectedCourses.forEach((dc) => {
          const value = String(row[dc.columnName] || "").trim().toLowerCase();
          if (value === "x" || value === "yes" || value === "sim" || value === "1") {
            rowCourses.push({
              columnName: dc.columnName,
              courseId: dc.courseId,
              courseName: dc.courseName,
            });
            totalEnrollments++;
          }
        });

        if (rowCourses.length > 0) {
          rows.push({ name, courses: rowCourses });
        }
      });

      setPreviewData({
        rows,
        detectedCourses,
        totalEnrollments,
      });
      setStep("preview");

    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Erro ao processar ficheiro. Verifique o formato.");
    }
  };

  // Process the import
  const processImport = async () => {
    if (!previewData || !currentWorkspace?.id) return;

    setStep("importing");
    setImportProgress(0);

    const processingResult: ProcessingResult = {
      contactsProcessed: 0,
      contactsCreated: 0,
      profilesCreated: 0,
      profilesExisting: 0,
      enrollmentsCreated: 0,
      enrollmentsSkipped: 0,
    };

    try {
      // Fetch current user for created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Utilizador não autenticado");
        setStep("preview");
        return;
      }

      // Fetch all contacts for matching
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id);

      const contactsMap = new Map<string, Contact>();
      (contacts || []).forEach((c) => {
        contactsMap.set(c.name.toLowerCase().trim(), c);
      });

      // Fetch all existing profiles
      const { data: existingProfiles } = await supabase
        .from("sj_profiles")
        .select("id, contact_id")
        .eq("workspace_id", currentWorkspace.id);

      const profilesByContactId = new Map<string, SJProfile>();
      (existingProfiles || []).forEach((p) => {
        if (p.contact_id) {
          profilesByContactId.set(p.contact_id, p);
        }
      });

      const totalRows = previewData.rows.length;

      for (let i = 0; i < totalRows; i++) {
        const row = previewData.rows[i];
        
        // Update progress
        setImportProgress(Math.round(((i + 1) / totalRows) * 100));

        // 1. Find or CREATE contact by name (case-insensitive)
        let contact = contactsMap.get(row.name.toLowerCase().trim());
        
        if (!contact) {
          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from("contacts")
            .insert({
              workspace_id: currentWorkspace.id,
              created_by: user.id,
              name: row.name,
            })
            .select("id, name")
            .single();

          if (contactError) {
            console.error("Error creating contact:", contactError);
            continue;
          }

          contact = newContact;
          contactsMap.set(row.name.toLowerCase().trim(), newContact);
          processingResult.contactsCreated++;
        }

        processingResult.contactsProcessed++;

        // 2. Find or create profile
        let profile = profilesByContactId.get(contact.id);
        
        if (!profile) {
          // Create new profile
          const { data: newProfile, error: profileError } = await supabase
            .from("sj_profiles")
            .insert({
              workspace_id: currentWorkspace.id,
              full_name: row.name,
              contact_id: contact.id,
              lifecycle_stage: "completed",
            })
            .select("id, contact_id")
            .single();

          if (profileError) {
            console.error("Error creating profile:", profileError);
            continue;
          }

          profile = newProfile;
          profilesByContactId.set(contact.id, newProfile);
          processingResult.profilesCreated++;
        } else {
          processingResult.profilesExisting++;
        }

        // 3. Create enrollments for each course marked with "x"
        for (const course of row.courses) {
          // Check if enrollment already exists
          const { data: existingEnrollment } = await supabase
            .from("sj_enrollments")
            .select("id")
            .eq("profile_id", profile.id)
            .eq("course_id", course.courseId)
            .maybeSingle();

          if (existingEnrollment) {
            processingResult.enrollmentsSkipped++;
            continue;
          }

          // Create enrollment
          const { error: enrollmentError } = await supabase
            .from("sj_enrollments")
            .insert({
              workspace_id: currentWorkspace.id,
              profile_id: profile.id,
              course_id: course.courseId,
              status: "completed",
              progress_percent: 100,
            });

          if (enrollmentError) {
            console.error("Error creating enrollment:", enrollmentError);
          } else {
            processingResult.enrollmentsCreated++;
          }
        }
      }

      setResult(processingResult);
      setStep("complete");

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });

      toast.success(`Importação concluída: ${processingResult.enrollmentsCreated} inscrições criadas`);

    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro durante a importação");
      setStep("preview");
    }
  };

  const resetDialog = () => {
    setStep("upload");
    setPreviewData(null);
    setResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetDialog();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Importar Inscrições
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Importar Inscrições em Massa
          </DialogTitle>
          <DialogDescription>
            Importar inscrições em formações a partir de ficheiro Excel
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="flex-1 py-8">
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Arraste o ficheiro Excel aqui
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos suportados: .xlsx, .xls
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Estrutura esperada do ficheiro
              </h4>
              <p className="text-sm text-muted-foreground">
                O ficheiro deve conter uma coluna <strong>Nome</strong> e colunas de formação 
                (Iniciação, Básica, Avançada, Tricologia, Aromaterapia) marcadas com "x" 
                para indicar que o cliente completou a formação.
              </p>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && previewData && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <User className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{previewData.rows.length}</p>
                <p className="text-sm text-muted-foreground">Clientes</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <GraduationCap className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{previewData.detectedCourses.length}</p>
                <p className="text-sm text-muted-foreground">Formações</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <ClipboardList className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{previewData.totalEnrollments}</p>
                <p className="text-sm text-muted-foreground">Inscrições</p>
              </div>
            </div>

            {/* Detected courses */}
            <div className="space-y-2">
              <h4 className="font-medium">Formações detectadas:</h4>
              <div className="flex flex-wrap gap-2">
                {previewData.detectedCourses.map((dc) => (
                  <Badge key={dc.courseId} variant="secondary" className="gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {dc.courseName}
                    <span className="text-muted-foreground">({dc.count})</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-hidden border rounded-lg">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Formações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.rows.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {row.courses.map((c) => (
                              <Badge key={c.courseId} variant="outline" className="text-xs">
                                {c.courseName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {previewData.rows.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2 border-t">
                  Mostrando 50 de {previewData.rows.length} linhas
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Voltar
              </Button>
              <Button onClick={processImport} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Importar {previewData.totalEnrollments} Inscrições
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="flex-1 py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">A processar importação...</p>
              <p className="text-sm text-muted-foreground">
                Por favor aguarde enquanto as inscrições são criadas
              </p>
            </div>
            <Progress value={importProgress} className="h-3" />
            <p className="text-center text-sm text-muted-foreground">
              {importProgress}% concluído
            </p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && result && (
          <div className="flex-1 py-6 space-y-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">Importação concluída!</p>
            </div>

            {/* Results summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Contactos processados</p>
                <p className="text-2xl font-bold text-green-600">{result.contactsProcessed}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Inscrições criadas</p>
                <p className="text-2xl font-bold text-green-600">{result.enrollmentsCreated}</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Perfis criados</p>
                <p className="text-2xl font-bold text-blue-600">{result.profilesCreated}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Inscrições já existentes</p>
                <p className="text-2xl font-bold">{result.enrollmentsSkipped}</p>
              </div>
            </div>

            {/* Contacts created */}
            {result.contactsCreated > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    {result.contactsCreated} contactos criados automaticamente
                  </p>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Os contactos que não existiam foram criados no CRM durante a importação.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
