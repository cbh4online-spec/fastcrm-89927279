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
    console.log(`[IMPORTS] File parsed: ${file.name}, ${rows.length} rows, ${headers.length} columns`);
    
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

  const checkDuplicate = async (
    tableName: string,
    insertData: Record<string, unknown>,
    workspaceId: string
  ): Promise<{ isDuplicate: boolean; existingId?: string; matchField?: string }> => {
    // Check by tax_id (NIF) first - strongest identifier
    if (insertData.tax_id && String(insertData.tax_id).trim()) {
      const { data } = await (supabase
        .from(tableName as any)
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("tax_id", String(insertData.tax_id).trim())
        .limit(1) as any);
      if (data && (data as any[]).length > 0) {
        return { isDuplicate: true, existingId: (data as any[])[0].id, matchField: "NIF" };
      }
    }

    // Check by email
    if (insertData.email && String(insertData.email).trim()) {
      const { data } = await (supabase
        .from(tableName as any)
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", String(insertData.email).trim().toLowerCase())
        .limit(1) as any);
      if (data && (data as any[]).length > 0) {
        return { isDuplicate: true, existingId: (data as any[])[0].id, matchField: "Email" };
      }
    }

    // Check by phone
    if (insertData.phone && String(insertData.phone).trim()) {
      const normalizedPhone = String(insertData.phone).replace(/\s+/g, "").replace(/^(\+351|00351)/, "");
      const { data } = await (supabase
        .from(tableName as any)
        .select("id, phone")
        .eq("workspace_id", workspaceId)
        .not("phone", "is", null)
        .limit(1000) as any);
      if (data) {
        const match = (data as any[]).find((row: any) => {
          const existingPhone = (row.phone || "").replace(/\s+/g, "").replace(/^(\+351|00351)/, "");
          return existingPhone === normalizedPhone && normalizedPhone.length >= 9;
        });
        if (match) {
          return { isDuplicate: true, existingId: match.id, matchField: "Telefone" };
        }
      }
    }

    return { isDuplicate: false };
  };

  const processImport = async () => {
    if (!currentWorkspace || !user || !parsedData) return;
    
    setStep("importing");
    setImportStatus("processing");
    console.log(`[IMPORTS] Import started: ${importType}, ${parsedData.rows.length} rows, policy: ${conflictPolicy}`);
    
    // Save industry labels
    try {
      await setIndustryLabels.mutateAsync({ industryType: selectedIndustry });
    } catch (error) {
      console.warn("Não foi possível guardar preferências de indústria:", error);
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
        console.warn('[IMPORTS] CUSTOM_FIELD_CREATE_FAILED:', err);
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
          
          for (const transform of mapping.transformations) {
            if (transform.enabled && value) {
              value = applyTransformation(value, transform.type);
            }
          }

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

        // Normalize email to lowercase
        if (insertData.email) {
          insertData.email = String(insertData.email).trim().toLowerCase();
        }

        // Check for duplicates
        const duplicate = await checkDuplicate(tableName, insertData, currentWorkspace.id);
        
        if (duplicate.isDuplicate && duplicate.existingId) {
          result.duplicatesFound++;
          
          if (conflictPolicy === "fill_empty") {
            // Only update empty fields
            const updateData: Record<string, unknown> = {};
            const { data: existingRecord } = await (supabase
              .from(tableName as any)
              .select("*")
              .eq("id", duplicate.existingId)
              .single() as any);
            
            if (existingRecord) {
              for (const [key, value] of Object.entries(insertData)) {
                if (key === "workspace_id" || key === "created_by") continue;
                const existingVal = (existingRecord as Record<string, unknown>)[key];
                if (!existingVal || existingVal === "" || (Array.isArray(existingVal) && existingVal.length === 0)) {
                  updateData[key] = value;
                }
              }
              
              if (Object.keys(updateData).length > 0) {
                const { error } = await (supabase.from(tableName as any).update(updateData as never).eq("id", duplicate.existingId) as any);
                if (!error) {
                  result.duplicatesUpdated++;
                  result.success++;
                } else {
                  result.errors++;
                  result.errorDetails.push({ row: i + 1, error: `Erro ao atualizar duplicado (${duplicate.matchField}): ${error.message}` });
                }
              } else {
                result.skipped++;
                result.errorDetails.push({ row: i + 1, error: `Duplicado por ${duplicate.matchField} — sem campos vazios para preencher` });
              }
            }
          } else if (conflictPolicy === "always_update") {
            // Update all fields
            const updateData = { ...insertData };
            delete updateData.workspace_id;
            delete updateData.created_by;
            
            const { error } = await supabase.from(tableName).update(updateData as never).eq("id", duplicate.existingId);
            if (!error) {
              result.duplicatesUpdated++;
              result.success++;
            } else {
              result.errors++;
              result.errorDetails.push({ row: i + 1, error: `Erro ao atualizar: ${error.message}` });
            }
          } else {
            // 'ask' policy — skip duplicates with warning
            result.skipped++;
            result.errorDetails.push({ row: i + 1, error: `Duplicado encontrado por ${duplicate.matchField} — ignorado` });
          }
          continue;
        }

        // No duplicate — insert
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
    console.log(`[IMPORTS] Import complete: ${result.success} success, ${result.errors} errors, ${result.skipped} skipped, ${result.duplicatesFound} duplicates found, ${result.duplicatesUpdated} updated`);
    if (result.errorDetails.length > 0) {
      console.warn(`[IMPORTS] Row issues: ${result.errorDetails.length}`);
      result.errorDetails.slice(0, 10).forEach(e => console.warn(`[IMPORTS]   Row ${e.row}: ${e.error}`));
    }
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
