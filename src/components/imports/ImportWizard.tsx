import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportWizardProps {
  file: File;
  importType: string;
  onClose: () => void;
  onComplete: () => void;
}

type ImportStep = "parsing" | "mapping" | "preview" | "importing" | "complete";

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

const fieldMappings: Record<string, { field: string; label: string; required?: boolean }[]> = {
  contacts: [
    { field: "name", label: "Nome", required: true },
    { field: "email", label: "Email" },
    { field: "phone", label: "Telefone" },
    { field: "company", label: "Empresa" },
    { field: "job_title", label: "Cargo" },
    { field: "source", label: "Origem" },
    { field: "notes", label: "Notas" },
    { field: "linkedin_url", label: "LinkedIn" },
    { field: "facebook_url", label: "Facebook" },
    { field: "instagram_url", label: "Instagram" },
    { field: "twitter_url", label: "Twitter" },
    { field: "tags", label: "Tags" },
  ],
  companies: [
    { field: "name", label: "Nome", required: true },
    { field: "email", label: "Email" },
    { field: "phone", label: "Telefone" },
    { field: "fax", label: "Fax" },
    { field: "website", label: "Website" },
    { field: "address", label: "Morada" },
    { field: "postal_code", label: "Código Postal" },
    { field: "city", label: "Cidade" },
    { field: "parish", label: "Freguesia" },
    { field: "county", label: "Concelho" },
    { field: "region", label: "Região" },
    { field: "tax_id", label: "NIF" },
    { field: "industry", label: "Indústria" },
    { field: "size", label: "Dimensão" },
    { field: "employee_count", label: "Nº Funcionários" },
    { field: "annual_revenue", label: "Receita Anual" },
    { field: "founding_date", label: "Data Fundação" },
    { field: "legal_nature", label: "Natureza Jurídica" },
    { field: "capital_social", label: "Capital Social" },
    { field: "cae_codes", label: "Códigos CAE" },
    { field: "cae_description", label: "Descrição CAE" },
    { field: "notes", label: "Notas" },
    { field: "source", label: "Origem" },
    { field: "linkedin_url", label: "LinkedIn" },
    { field: "facebook_url", label: "Facebook" },
    { field: "instagram_url", label: "Instagram" },
    { field: "twitter_url", label: "Twitter" },
    { field: "tags", label: "Tags" },
  ],
  leads: [
    { field: "name", label: "Nome", required: true },
    { field: "email", label: "Email" },
    { field: "phone", label: "Telefone" },
    { field: "company", label: "Empresa" },
    { field: "source", label: "Origem" },
    { field: "status", label: "Estado" },
    { field: "notes", label: "Notas" },
    { field: "linkedin_url", label: "LinkedIn" },
    { field: "facebook_url", label: "Facebook" },
    { field: "instagram_url", label: "Instagram" },
    { field: "twitter_url", label: "Twitter" },
    { field: "tags", label: "Tags" },
  ],
  products: [
    { field: "name", label: "Nome", required: true },
    { field: "description", label: "Descrição" },
    { field: "price", label: "Preço" },
    { field: "sku", label: "SKU" },
    { field: "category", label: "Categoria" },
    { field: "unit", label: "Unidade" },
    { field: "tax_rate", label: "Taxa IVA" },
    { field: "cost", label: "Custo" },
  ],
};

export function ImportWizard({ file, importType, onClose, onComplete }: ImportWizardProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [step, setStep] = useState<ImportStep>("parsing");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });

  const availableFields = fieldMappings[importType] || [];

  // Parse file on mount
  useEffect(() => {
    parseFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseFile = async () => {
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const headers = results.meta.fields || [];
            const rows = results.data as Record<string, string>[];
            setParsedData({ headers, rows });
            autoMapColumns(headers);
            setStep("mapping");
          },
          error: (error) => {
            toast.error("Erro ao ler ficheiro CSV: " + error.message);
            onClose();
          },
        });
      } else if (extension === "xlsx" || extension === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Try to find the header row by looking for non-empty content
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
        let headerRowIndex = 0;
        
        // Look for the first row with meaningful data (not all empty)
        for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
          let hasContent = false;
          let contentCount = 0;
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
            if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== "") {
              hasContent = true;
              contentCount++;
            }
          }
          // Consider this the header row if it has at least 2 cells with content
          if (hasContent && contentCount >= 2) {
            headerRowIndex = r;
            break;
          }
        }
        
        // Parse with header starting at detected row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { 
          defval: "",
          range: headerRowIndex
        });
        
        if (jsonData.length > 0) {
          // Filter out columns that are empty or have names like __EMPTY
          const allHeaders = Object.keys(jsonData[0]);
          const validHeaders = allHeaders.filter(h => {
            // Exclude __EMPTY columns and columns with no name
            if (!h || h.startsWith("__EMPTY") || h.startsWith("_")) return false;
            // Check if at least one row has data for this column
            return jsonData.some(row => {
              const val = row[h];
              return val !== undefined && val !== null && String(val).trim() !== "";
            });
          });
          
          if (validHeaders.length === 0) {
            toast.error("Não foram encontradas colunas válidas no ficheiro");
            onClose();
            return;
          }
          
          // Create filtered rows with only valid headers
          const filteredRows = jsonData.map(row => {
            const filteredRow: Record<string, string> = {};
            validHeaders.forEach(h => {
              filteredRow[h] = String(row[h] || "").trim();
            });
            return filteredRow;
          }).filter(row => {
            // Filter out completely empty rows
            return validHeaders.some(h => row[h] && row[h].trim() !== "");
          });
          
          setParsedData({ headers: validHeaders, rows: filteredRows });
          autoMapColumns(validHeaders);
          setStep("mapping");
        } else {
          toast.error("Ficheiro vazio ou sem dados válidos");
          onClose();
        }
      } else {
        toast.error("Formato de ficheiro não suportado");
        onClose();
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erro ao processar ficheiro");
      onClose();
    }
  };

  const autoMapColumns = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    
    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Try to auto-match columns
      for (const field of availableFields) {
        const fieldName = field.field.toLowerCase();
        const fieldLabel = field.label.toLowerCase();
        
        if (
          normalizedHeader === fieldName ||
          normalizedHeader === fieldLabel ||
          normalizedHeader.includes(fieldName) ||
          normalizedHeader.includes(fieldLabel)
        ) {
          mapping[header] = field.field;
          break;
        }
      }
    });
    
    setColumnMapping(mapping);
  };

  const handleMappingChange = (column: string, field: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [column]: field === "ignore" ? "" : field,
    }));
  };

  const getMappedRows = () => {
    if (!parsedData) return [];
    
    return parsedData.rows.map((row) => {
      const mappedRow: Record<string, string> = {};
      
      Object.entries(columnMapping).forEach(([column, field]) => {
        if (field) {
          mappedRow[field] = row[column] || "";
        }
      });
      
      return mappedRow;
    });
  };

  const hasRequiredFields = () => {
    const mappedFields = Object.values(columnMapping).filter(Boolean);
    const requiredFields = availableFields.filter((f) => f.required).map((f) => f.field);
    return requiredFields.every((field) => mappedFields.includes(field));
  };

  const processImport = async () => {
    if (!currentWorkspace || !user) {
      toast.error("Workspace não encontrado");
      return;
    }

    setStep("importing");
    const mappedRows = getMappedRows();
    let success = 0;
    let errors = 0;

    const tableName = importType === "contacts" ? "contacts" : 
                      importType === "companies" ? "companies" :
                      importType === "leads" ? "leads" : "products";

    for (let i = 0; i < mappedRows.length; i++) {
      const row = mappedRows[i];
      
      // Skip rows without required fields
      if (!row.name) {
        errors++;
        continue;
      }

      try {
        // Build base insert data
        const insertData: Record<string, unknown> = {
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: row.name,
        };

        // Add all mapped fields dynamically
        Object.entries(row).forEach(([field, value]) => {
          if (field === "name" || !value) return;
          
          // Handle special field types
          if (["price", "cost", "annual_revenue", "employee_count", "tax_rate"].includes(field)) {
            const numValue = parseFloat(value);
            insertData[field] = isNaN(numValue) ? null : numValue;
          } else if (field === "tags" || field === "cae_codes") {
            // Convert comma-separated string to array
            insertData[field] = value.split(",").map((s: string) => s.trim()).filter(Boolean);
          } else {
            insertData[field] = value || null;
          }
        });

        // Set default status for leads
        if (importType === "leads" && !insertData.status) {
          insertData.status = "new";
        }

        const { error } = await supabase
          .from(tableName)
          .insert(insertData as never);
        
        if (error) {
          console.error("Insert error:", error);
          errors++;
        } else {
          success++;
        }
      } catch (err) {
        console.error("Row import error:", err);
        errors++;
      }

      setImportProgress(Math.round(((i + 1) / mappedRows.length) * 100));
    }

    setImportResults({ success, errors });
    setStep("complete");
  };

  if (step === "parsing") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">A processar ficheiro...</p>
            <p className="text-sm text-muted-foreground">{file.name}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "mapping") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mapear Colunas</CardTitle>
          <CardDescription>
            Associa as colunas do ficheiro aos campos do CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {parsedData?.headers.map((header) => (
              <div key={header} className="flex items-center gap-4">
                <div className="w-1/3">
                  <p className="font-medium text-sm">{header}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Ex: {parsedData.rows[0]?.[header] || "-"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={columnMapping[header] || "ignore"}
                  onValueChange={(value) => handleMappingChange(header, value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecionar campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">Ignorar</SelectItem>
                    {availableFields.map((field) => (
                      <SelectItem key={field.field} value={field.field}>
                        {field.label} {field.required && "*"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {!hasRequiredFields() && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4" />
              Campos obrigatórios não mapeados: Nome
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={() => setStep("preview")} disabled={!hasRequiredFields()}>
              Pré-visualizar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    const previewRows = getMappedRows().slice(0, 5);
    const mappedFields = availableFields.filter((f) =>
      Object.values(columnMapping).includes(f.field)
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>
            Revê os dados antes de importar ({parsedData?.rows.length} registos)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {mappedFields.map((field) => (
                    <TableHead key={field.field}>{field.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, idx) => (
                  <TableRow key={idx}>
                    {mappedFields.map((field) => (
                      <TableCell key={field.field} className="text-sm">
                        {row[field.field] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {(parsedData?.rows.length || 0) > 5 && (
            <p className="text-sm text-muted-foreground text-center">
              A mostrar 5 de {parsedData?.rows.length} registos
            </p>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={processImport}>
              <Upload className="h-4 w-4 mr-2" />
              Importar {parsedData?.rows.length} registos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "importing") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">A importar dados...</p>
            <Progress value={importProgress} className="w-64" />
            <p className="text-sm text-muted-foreground">{importProgress}% concluído</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "complete") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-xl font-bold">Importação Concluída!</p>
            
            <div className="flex gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                <p className="text-sm text-muted-foreground">Importados</p>
              </div>
              {importResults.errors > 0 && (
                <div className="text-center p-4 bg-destructive/10 rounded-lg">
                  <p className="text-2xl font-bold text-destructive">{importResults.errors}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              )}
            </div>

            <Button onClick={onComplete} className="mt-4">
              Concluir
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
