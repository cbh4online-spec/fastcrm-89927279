import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Eye,
  CheckCircle2,
  Wand2,
  AlertTriangle,
} from "lucide-react";
import { ColumnMapping, ENTITY_FIELDS, ImportEntityType, DataTransformation } from "@/types/import";
import { applyTransformation } from "@/utils/dataTypeDetection";

interface PreviewStepProps {
  importType: ImportEntityType;
  rows: Record<string, string>[];
  columnMappings: ColumnMapping[];
  totalRows: number;
  onNext: () => void;
  onBack: () => void;
}

interface TransformedValue {
  original: string;
  transformed: string;
  transformations: DataTransformation[];
}

export function PreviewStep({
  importType,
  rows,
  columnMappings,
  totalRows,
  onNext,
  onBack,
}: PreviewStepProps) {
  const availableFields = ENTITY_FIELDS[importType] || [];

  // Get only mapped columns (those with a target field)
  const mappedColumns = columnMappings.filter((m) => m.targetField);

  // Get field labels
  const getFieldLabel = (fieldName: string) => {
    const field = availableFields.find((f) => f.field === fieldName);
    return field?.label || fieldName;
  };

  // Transform preview rows
  const previewRows = useMemo(() => {
    return rows.slice(0, 5).map((row) => {
      const transformedRow: Record<string, TransformedValue> = {};

      for (const mapping of mappedColumns) {
        const originalValue = row[mapping.sourceColumn] || '';
        let transformedValue = originalValue;
        const appliedTransformations: DataTransformation[] = [];

        // Apply enabled transformations
        for (const transform of mapping.transformations) {
          if (transform.enabled && originalValue) {
            transformedValue = applyTransformation(transformedValue, transform.type);
            appliedTransformations.push(transform);
          }
        }

        transformedRow[mapping.targetField!] = {
          original: originalValue,
          transformed: transformedValue,
          transformations: appliedTransformations,
        };
      }

      return transformedRow;
    });
  }, [rows, mappedColumns]);

  // Count transformations that will be applied
  const transformationStats = useMemo(() => {
    let totalTransformations = 0;
    const transformationTypes: Record<string, number> = {};

    for (const mapping of mappedColumns) {
      const enabledTransforms = mapping.transformations.filter((t) => t.enabled);
      if (enabledTransforms.length > 0) {
        // Count rows that would be affected
        const affectedRows = rows.filter((row) => {
          const value = row[mapping.sourceColumn];
          return value && value.trim();
        }).length;

        for (const transform of enabledTransforms) {
          totalTransformations += affectedRows;
          transformationTypes[transform.description] = 
            (transformationTypes[transform.description] || 0) + affectedRows;
        }
      }
    }

    return { totalTransformations, transformationTypes };
  }, [mappedColumns, rows]);

  const newFieldsCount = mappedColumns.filter((m) => m.isNewField).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Pré-visualização
          </span>
          <Badge variant="secondary" className="font-normal">
            {totalRows} registos
          </Badge>
        </CardTitle>
        <CardDescription>
          Revê como os dados serão guardados antes de importar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">{mappedColumns.length}</p>
            <p className="text-xs text-muted-foreground">Campos mapeados</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">{transformationStats.totalTransformations}</p>
            <p className="text-xs text-muted-foreground">Transformações</p>
          </div>
          {newFieldsCount > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{newFieldsCount}</p>
              <p className="text-xs text-muted-foreground">Novos campos</p>
            </div>
          )}
        </div>

        {/* Transformation Summary */}
        {Object.keys(transformationStats.transformationTypes).length > 0 && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
              <Wand2 className="h-4 w-4" />
              Transformações a aplicar
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(transformationStats.transformationTypes).map(([desc, count]) => (
                <Badge key={desc} variant="outline" className="font-normal">
                  {desc}: {count} valores
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Preview Table */}
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  {mappedColumns.map((mapping) => (
                    <TableHead key={mapping.targetField} className="min-w-[150px]">
                      <div className="flex items-center gap-1">
                        {getFieldLabel(mapping.targetField!)}
                        {mapping.isNewField && (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            novo
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] font-normal text-muted-foreground">
                        ← {mapping.sourceColumn}
                      </p>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {mappedColumns.map((mapping) => {
                      const value = row[mapping.targetField!];
                      const hasTransformation = value?.transformations?.length > 0;
                      const valueChanged = value?.original !== value?.transformed;

                      return (
                        <TableCell key={mapping.targetField} className="text-sm">
                          {hasTransformation && valueChanged ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <span className="text-green-600 font-medium">
                                      {value.transformed || '-'}
                                    </span>
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <div className="text-xs">
                                    <p className="text-muted-foreground">Original: {value.original}</p>
                                    <p className="text-green-600">→ {value.transformed}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span>{value?.transformed || value?.original || '-'}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {totalRows > 5 && (
          <p className="text-sm text-muted-foreground text-center">
            A mostrar 5 de {totalRows} registos
          </p>
        )}

        {/* Warning for new fields */}
        {newFieldsCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-700">
                {newFieldsCount} campo(s) novo(s) serão criados
              </p>
              <p className="text-muted-foreground">
                Estes campos ficarão disponíveis em todos os registos deste tipo.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={onNext}>
            <Upload className="h-4 w-4 mr-2" />
            Importar {totalRows} registos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
