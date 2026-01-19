import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ActivityProfileSelector } from "../ActivityProfileSelector";
import { ActivityProfileType } from "@/types/activityProfile";

interface ActivityProfileStepProps {
  value: ActivityProfileType | undefined;
  suggestedProfile?: ActivityProfileType;
  onChange: (value: ActivityProfileType) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ActivityProfileStep({
  value,
  suggestedProfile,
  onChange,
  onNext,
  onBack,
}: ActivityProfileStepProps) {
  const isValid = !!value;

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Perfil de Atividade
        </h2>
        <p className="text-muted-foreground">
          Seleciona o perfil que melhor descreve o teu negócio. 
          Isto vai adaptar campos, módulos e sugestões da IA à tua realidade.
        </p>
        {suggestedProfile && !value && (
          <p className="text-sm text-primary mt-2">
            💡 Com base no tipo de negócio, sugerimos: <strong>{suggestedProfile}</strong>
          </p>
        )}
      </div>

      <ActivityProfileSelector
        value={value}
        onChange={onChange}
        className="max-w-3xl mx-auto"
      />

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
