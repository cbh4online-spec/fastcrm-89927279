import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Users,
  RefreshCw,
} from "lucide-react";
import { ImportResult, ConflictResolution } from "@/types/import";

interface ImportProgressStepProps {
  progress: number;
  totalRows: number;
  currentRow: number;
  status: 'processing' | 'resolving_conflicts' | 'complete' | 'error';
  result?: ImportResult;
  conflict?: {
    rowNumber: number;
    field: string;
    fieldLabel: string;
    existingValue: string;
    newValue: string;
    entityName: string;
  };
  onResolveConflict: (resolution: 'keep_existing' | 'use_new' | 'skip') => void;
  onComplete: () => void;
  onRetry?: () => void;
}

export function ImportProgressStep({
  progress,
  totalRows,
  currentRow,
  status,
  result,
  conflict,
  onResolveConflict,
  onComplete,
  onRetry,
}: ImportProgressStepProps) {
  const [selectedResolution, setSelectedResolution] = useState<'keep_existing' | 'use_new' | 'skip'>('keep_existing');

  if (status === 'resolving_conflicts' && conflict) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <CardTitle>Conflito Detectado</CardTitle>
          </div>
          <CardDescription>
            Linha {conflict.rowNumber}: "{conflict.entityName}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <p className="text-sm font-medium">{conflict.fieldLabel}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Valor Existente</p>
                <p className="font-medium">{conflict.existingValue || '(vazio)'}</p>
              </div>
              <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Valor Novo</p>
                <p className="font-medium">{conflict.newValue || '(vazio)'}</p>
              </div>
            </div>
          </div>

          <RadioGroup
            value={selectedResolution}
            onValueChange={(v) => setSelectedResolution(v as typeof selectedResolution)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="keep_existing" id="keep" />
              <Label htmlFor="keep" className="cursor-pointer flex-1">
                Manter valor existente
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="use_new" id="use_new" />
              <Label htmlFor="use_new" className="cursor-pointer flex-1">
                Usar valor novo
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="skip" id="skip" />
              <Label htmlFor="skip" className="cursor-pointer flex-1">
                Saltar este registo
              </Label>
            </div>
          </RadioGroup>

          <div className="flex justify-end">
            <Button onClick={() => onResolveConflict(selectedResolution)}>
              Aplicar e Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <Progress value={(currentRow / totalRows) * 100} className="mt-4" />
          <p className="text-xs text-center text-muted-foreground">
            {currentRow} de {totalRows} registos processados
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'complete' && result) {
    return (
      <Card>
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-1">Importação Concluída</h2>
            <p className="text-muted-foreground">
              Os dados foram processados com sucesso
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{result.success}</p>
              <p className="text-sm text-muted-foreground">Importados</p>
            </div>
            {result.errors > 0 && (
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            )}
            {result.skipped > 0 && (
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-sm text-muted-foreground">Saltados</p>
              </div>
            )}
            {result.duplicatesUpdated > 0 && (
              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{result.duplicatesUpdated}</p>
                <p className="text-sm text-muted-foreground">Atualizados</p>
              </div>
            )}
          </div>

          {result.fieldsCreated.length > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg mb-6">
              <p className="text-sm font-medium mb-2">Campos personalizados criados:</p>
              <div className="flex flex-wrap gap-2">
                {result.fieldsCreated.map((field) => (
                  <Badge key={field} variant="secondary">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {result.errorDetails.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Erros encontrados:
              </p>
              <ScrollArea className="h-32 border rounded-lg p-2">
                {result.errorDetails.slice(0, 10).map((error, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground py-1">
                    Linha {error.row}: {error.error}
                  </p>
                ))}
                {result.errorDetails.length > 10 && (
                  <p className="text-xs text-muted-foreground py-1">
                    ... e mais {result.errorDetails.length - 10} erros
                  </p>
                )}
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onComplete}>
              <FileText className="h-4 w-4 mr-2" />
              Ver Importações
            </Button>
            <Button onClick={onComplete}>
              <Users className="h-4 w-4 mr-2" />
              Ver Registos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card>
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-1">Erro na Importação</h2>
            <p className="text-muted-foreground">
              Ocorreu um erro durante o processamento
            </p>
          </div>

          <div className="flex justify-center gap-3">
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            )}
            <Button onClick={onComplete}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Processing state
  return (
    <Card>
      <CardContent className="pt-8 pb-6">
        <div className="text-center mb-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-1">A importar dados...</h2>
          <p className="text-muted-foreground">
            Por favor aguarda enquanto os registos são processados
          </p>
        </div>

        <Progress value={progress} className="mb-2" />
        <p className="text-sm text-center text-muted-foreground">
          {currentRow} de {totalRows} registos ({Math.round(progress)}%)
        </p>
      </CardContent>
    </Card>
  );
}
