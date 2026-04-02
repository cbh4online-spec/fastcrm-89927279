import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ImportJobProgressProps {
  currentStep: string;
  progressPercent: number;
}

const STEP_LABELS: Record<string, string> = {
  uploading: "A enviar ficheiro...",
  parsing: "A parsear ficheiro...",
  matching: "A fazer matching...",
  pricing: "A calcular preços...",
  committing: "A gravar alterações...",
  committed: "Importação concluída",
};

export function ImportJobProgress({ currentStep, progressPercent }: ImportJobProgressProps) {
  const label = STEP_LABELS[currentStep] || `A processar (${currentStep})...`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">{progressPercent}% concluído</p>
      </CardContent>
    </Card>
  );
}
