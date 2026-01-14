import { AlertTriangle, Shield, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Critical fields that should trigger warnings when automations modify them
export const CRITICAL_FIELDS = {
  lead: ["status", "owner_id", "email"],
  opportunity: ["status", "stage_id", "owner_id", "value"],
  contact: ["email", "owner_id"],
  company: ["owner_id"],
};

export const CRITICAL_FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  owner_id: "Responsável",
  stage_id: "Etapa",
  value: "Valor",
  email: "Email",
};

interface CriticalFieldsWarningProps {
  entityType: string;
  fieldsBeingUpdated: string[];
  className?: string;
}

export function CriticalFieldsWarning({
  entityType,
  fieldsBeingUpdated,
  className,
}: CriticalFieldsWarningProps) {
  const criticalForEntity = CRITICAL_FIELDS[entityType as keyof typeof CRITICAL_FIELDS] || [];
  const affectedCriticalFields = fieldsBeingUpdated.filter((f) =>
    criticalForEntity.includes(f)
  );

  if (affectedCriticalFields.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Campos críticos afetados
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Campos críticos são aqueles que podem afetar significativamente o
                fluxo de trabalho ou a integridade dos dados. Certifique-se de que
                as alterações são intencionais.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-2">
          Esta automação irá modificar os seguintes campos críticos:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {affectedCriticalFields.map((field) => (
            <Badge
              key={field}
              variant="outline"
              className="bg-destructive/10 border-destructive/30"
            >
              <Shield className="h-3 w-3 mr-1" />
              {CRITICAL_FIELD_LABELS[field] || field}
            </Badge>
          ))}
        </div>
        <p className="text-xs mt-2 text-muted-foreground">
          Recomendamos adicionar condições para limitar quando estas alterações ocorrem.
        </p>
      </AlertDescription>
    </Alert>
  );
}

interface LoopDetectionWarningProps {
  potentialLoop: boolean;
  loopDetails?: {
    triggerField: string;
    actionField: string;
  };
  className?: string;
}

export function LoopDetectionWarning({
  potentialLoop,
  loopDetails,
  className,
}: LoopDetectionWarningProps) {
  if (!potentialLoop) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Potencial loop infinito detetado</AlertTitle>
      <AlertDescription>
        <p className="text-sm">
          Esta automação pode criar um loop infinito porque:
        </p>
        {loopDetails && (
          <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
            <li>
              O gatilho é ativado quando{" "}
              <code className="px-1 py-0.5 rounded bg-muted">
                {loopDetails.triggerField}
              </code>{" "}
              muda
            </li>
            <li>
              Uma ação modifica{" "}
              <code className="px-1 py-0.5 rounded bg-muted">
                {loopDetails.actionField}
              </code>
            </li>
            <li>Isso pode reativar o gatilho indefinidamente</li>
          </ul>
        )}
        <p className="text-xs mt-2 text-muted-foreground">
          Para evitar loops, adicione condições que limitem a execução ou use
          campos diferentes.
        </p>
      </AlertDescription>
    </Alert>
  );
}
