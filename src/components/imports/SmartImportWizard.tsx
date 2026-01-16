import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { IndustryModelStep } from "./steps/IndustryModelStep";
import { ColumnMappingStep } from "./steps/ColumnMappingStep";
import { PreviewStep } from "./steps/PreviewStep";
import { ConflictPolicyStep } from "./steps/ConflictPolicyStep";
import { ImportProgressStep } from "./steps/ImportProgressStep";

import { useSetIndustryLabels } from "@/hooks/useIndustryLabels";
import { useCreateCustomField } from "@/hooks/useCustomFields";
import { analyzeColumn } from "@/utils/dataTypeDetection";
import {
  IndustryType,
  ImportEntityType,
  ColumnMapping,
  ColumnDetection,
  ConflictPolicy,
  ImportResult,
  ENTITY_FIELDS,
} from "@/types/import";
import { applyTransformation } from "@/utils/dataTypeDetection";

interface SmartImportWizardProps {
  file: File;
  importType: ImportEntityType;
  onClose: () => void;
  onComplete: () => void;
}

type WizardStep = "parsing" | "industry" | "mapping" | "conflicts" | "preview" | "importing";

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

export function SmartImportWizard({ file, importType, onClose, onComplete }: SmartImportWizardProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const setIndustryLabels = useSetIndustryLabels();
  const createCustomField = useCreateCustomField();

  const [step, setStep] = useState<WizardStep>("parsing");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>("default");
  const [columnDetections, setColumnDetections] = useState<ColumnDetection[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>("ask");
  const [criticalFields, setCriticalFields] = useState<string[]>(["email", "phone", "tax_id", "name"]);
  
  const [importProgress, setImportProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [importStatus, setImportStatus] = useState<"processing" | "resolving_conflicts" | "complete" | "error">("processing");
  const [importResult, setImportResult] = useState<ImportResult | undefined>();

  // Parse file on mount
  useEffect(() => {
    parseFile();
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
            processData(headers, rows);
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
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });
        
        if (jsonData.length > 0) {
          const allHeaders = Object.keys(jsonData[0]);
          const validHeaders = allHeaders.filter(h => !h.startsWith("__EMPTY") && !h.startsWith("_"));
          const filteredRows = jsonData.map(row => {
            const filteredRow: Record<string, string> = {};
            validHeaders.forEach(h => { filteredRow[h] = String(row[h] || "").trim(); });
            return filteredRow;
          }).filter(row => validHeaders.some(h => row[h]?.trim()));
          
          processData(validHeaders, filteredRows);
        } else {
          toast.error("Ficheiro vazio");
          onClose();
        }
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erro ao processar ficheiro");
      onClose();
    }
  };

  const processData = (headers: string[], rows: Record<string, string>[]) => {
    setParsedData({ headers, rows });
    
    // Analyze columns
    const detections = headers.map(header => {
      const values = rows.map(row => row[header] || "");
      return analyzeColumn(header, values);
    });
    setColumnDetections(detections);
    
    // Initialize mappings
    const initialMappings: ColumnMapping[] = detections.map(detection => ({
      sourceColumn: detection.header,
      targetField: detection.suggestedField || null,
      isNewField: false,
      detectedType: detection.detectedType,
      transformations: detection.suggestedTransformations || [],
      applyTransformations: true,
    }));
    setColumnMappings(initialMappings);
    
    setStep("industry");
  };

  const processImport = async () => {
    if (!currentWorkspace || !user || !parsedData) return;
    
    setStep("importing");
    setImportStatus("processing");
    
    // Save industry labels (optional, doesn't block import)
    try {
      await setIndustryLabels.mutateAsync({
        industryType: selectedIndustry,
      });
    } catch (error) {
      console.warn("Não foi possível guardar preferências de indústria:", error);
      // Continue with import even if this fails
    }

    const tableName = importType === "contacts" ? "contacts" : 
                      importType === "companies" ? "companies" :
                      importType === "leads" ? "leads" : "products";

    const mappedColumns = columnMappings.filter(m => m.targetField);
    const result: ImportResult = { success: 0, errors: 0, skipped: 0, duplicatesFound: 0, duplicatesUpdated: 0, fieldsCreated: [], errorDetails: [] };

    // Create custom fields first
    for (const mapping of mappedColumns.filter(m => m.isNewField && m.newFieldConfig)) {
      try {
        await createCustomField.mutateAsync({
          entity_type: importType as "lead" | "contact" | "company",
          name: mapping.newFieldConfig!.label,
          field_type: mapping.newFieldConfig!.fieldType,
          options: mapping.newFieldConfig!.options,
          required: mapping.newFieldConfig!.required,
        });
        result.fieldsCreated.push(mapping.newFieldConfig!.label);
      } catch (err) {
        console.error("Error creating field:", err);
      }
    }

    // Process rows
    for (let i = 0; i < parsedData.rows.length; i++) {
      const row = parsedData.rows[i];
      setCurrentRow(i + 1);
      setImportProgress(Math.round(((i + 1) / parsedData.rows.length) * 100));

      try {
        const insertData: Record<string, unknown> = {
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        };

        for (const mapping of mappedColumns) {
          if (!mapping.targetField || mapping.isNewField) continue;
          
          let value = row[mapping.sourceColumn] || "";
          
          // Apply transformations
          for (const transform of mapping.transformations) {
            if (transform.enabled && value) {
              value = applyTransformation(value, transform.type);
            }
          }

          // Type conversions
          const fieldDef = ENTITY_FIELDS[importType]?.find(f => f.field === mapping.targetField);
          if (fieldDef?.type === "currency" || fieldDef?.type === "number") {
            insertData[mapping.targetField] = parseFloat(value) || null;
          } else if (fieldDef?.type === "tags") {
            insertData[mapping.targetField] = value.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
          } else {
            insertData[mapping.targetField] = value || null;
          }
        }

        if (!insertData.name) {
          result.errors++;
          result.errorDetails.push({ row: i + 1, error: "Nome obrigatório" });
          continue;
        }

        if (importType === "leads" && !insertData.status) {
          insertData.status = "new";
        }

        const { error } = await supabase.from(tableName).insert(insertData as never);
        
        if (error) {
          result.errors++;
          result.errorDetails.push({ row: i + 1, error: error.message });
        } else {
          result.success++;
        }
      } catch (err) {
        result.errors++;
        result.errorDetails.push({ row: i + 1, error: String(err) });
      }
    }

    setImportResult(result);
    setImportStatus("complete");
  };

  if (step === "parsing") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">A analisar ficheiro...</p>
            <p className="text-sm text-muted-foreground">{file.name}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "industry") {
    return (
      <IndustryModelStep
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
        onNext={() => setStep("mapping")}
        onBack={onClose}
      />
    );
  }

  if (step === "mapping") {
    return (
      <ColumnMappingStep
        importType={importType}
        columnDetections={columnDetections}
        columnMappings={columnMappings}
        onMappingChange={setColumnMappings}
        onNext={() => setStep("conflicts")}
        onBack={() => setStep("industry")}
      />
    );
  }

  if (step === "conflicts") {
    return (
      <ConflictPolicyStep
        conflictPolicy={conflictPolicy}
        criticalFields={criticalFields}
        onPolicyChange={setConflictPolicy}
        onCriticalFieldsChange={setCriticalFields}
        onNext={() => setStep("preview")}
        onBack={() => setStep("mapping")}
      />
    );
  }

  if (step === "preview") {
    return (
      <PreviewStep
        importType={importType}
        rows={parsedData?.rows || []}
        columnMappings={columnMappings}
        totalRows={parsedData?.rows.length || 0}
        onNext={processImport}
        onBack={() => setStep("conflicts")}
      />
    );
  }

  return (
    <ImportProgressStep
      progress={importProgress}
      totalRows={parsedData?.rows.length || 0}
      currentRow={currentRow}
      status={importStatus}
      result={importResult}
      onResolveConflict={() => {}}
      onComplete={onComplete}
    />
  );
}
