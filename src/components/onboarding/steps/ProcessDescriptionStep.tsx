import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";

interface ProcessDescriptionStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const exampleProcess = `1. O cliente encontra-nos através de anúncios ou recomendações
2. Preenche um formulário de contacto ou liga diretamente
3. Fazemos uma primeira chamada para entender as necessidades
4. Agendamos uma reunião de apresentação
5. Enviamos uma proposta personalizada
6. Negociamos condições se necessário
7. O cliente aceita e fazemos a formalização`;

export function ProcessDescriptionStep({
  value,
  onChange,
  onNext,
  onBack,
}: ProcessDescriptionStepProps) {
  const isValid = value.trim().length >= 20;

  const useExample = () => {
    onChange(exampleProcess);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Descreve o teu processo de vendas
        </h2>
        <p className="text-muted-foreground">
          Como funciona desde o primeiro contacto até ao fecho?
        </p>
      </div>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">Dicas para uma boa descrição:</p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Menciona como os leads te encontram (anúncios, recomendações, site)</li>
              <li>• Descreve as etapas principais (contacto, reunião, proposta)</li>
              <li>• Indica se fazes follow-ups e como</li>
              <li>• Refere se há reuniões, chamadas ou visitas</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="process" className="text-base">O teu processo</Label>
          <Button variant="ghost" size="sm" onClick={useExample}>
            <Lightbulb className="mr-1 h-3 w-3" />
            Ver exemplo
          </Button>
        </div>
        <Textarea
          id="process"
          placeholder="Descreve passo a passo como funciona o teu processo de vendas..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Mínimo de 20 caracteres. Quanto mais detalhes, melhor a configuração.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!isValid} size="lg">
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
