import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ChevronLeft, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedFlowResult {
  name: string;
  description: string;
  goalType: string;
  channels: string[];
  steps: Array<{
    name: string;
    type: string;
    message: string;
  }>;
}

interface GenerateFlowAIProps {
  onComplete: (data: {
    name: string;
    description?: string;
    goalType?: string;
    triggerChannels?: string[];
  }) => void;
  onCancel: () => void;
}

export function GenerateFlowAI({ onComplete, onCancel }: GenerateFlowAIProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedFlowResult | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-flow-ai', {
        body: { prompt: prompt.trim() }
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit') || data.error.includes('429')) {
          toast.error('Limite de pedidos atingido. Tente novamente mais tarde.');
        } else if (data.error.includes('402') || data.error.includes('credits')) {
          toast.error('Créditos AI esgotados. Adicione créditos para continuar.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      setResult(data?.result || data);
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('Erro ao gerar fluxo com IA. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;
    onComplete({
      name: result.name,
      description: result.description || undefined,
      goalType: result.goalType || undefined,
      triggerChannels: result.channels?.length > 0 ? result.channels : undefined
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Descreva o que precisa
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Escreva em linguagem natural o que quer que o fluxo faça e a IA cria a estrutura por si.
        </p>
      </div>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ex: Quero um fluxo que qualifique leads de imobiliário, pergunte o orçamento, tipo de imóvel e localização preferida, e depois encaminhe para um agente."
        rows={4}
        disabled={isGenerating}
      />

      {!result && (
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A gerar fluxo...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Fluxo
            </>
          )}
        </Button>
      )}

      {/* Preview */}
      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium text-sm">{result.name}</p>
            </div>
            {result.description && (
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm">{result.description}</p>
              </div>
            )}
            {result.steps && result.steps.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Passos sugeridos ({result.steps.length})</p>
                <div className="space-y-1">
                  {result.steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{s.type}</span>
                      <span className="font-medium truncate">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.channels && result.channels.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Canais</p>
                <p className="text-sm">{result.channels.join(', ')}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setResult(null)} className="flex-1">
              Regenerar
            </Button>
            <Button size="sm" onClick={handleConfirm} className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              Usar este fluxo
            </Button>
          </div>
        </div>
      )}

      {/* Cancel */}
      <div className="flex justify-start pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>
    </div>
  );
}
