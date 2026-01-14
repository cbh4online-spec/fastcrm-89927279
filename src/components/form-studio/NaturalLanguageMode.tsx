import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { FormField } from '@/types/formSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NaturalLanguageModeProps {
  onFieldsGenerated: (fields: FormField[]) => void;
}

const EXAMPLE_PROMPTS = [
  {
    title: 'Pedido de orçamento',
    prompt: 'Quero um formulário de pedido de orçamento para serviços de marketing. Perguntar nome, email, empresa, tipo de serviço (dropdown: SEO, Redes Sociais, Publicidade, Branding, Outro), orçamento mensal e urgência (baixa, média, alta).',
  },
  {
    title: 'Contacto simples',
    prompt: 'Formulário de contacto com nome, email, telefone e mensagem',
  },
  {
    title: 'Inscrição evento',
    prompt: 'Formulário para inscrição em workshop: nome completo, email, empresa, cargo, como soube do evento (dropdown), restrições alimentares',
  },
  {
    title: 'Qualificação lead',
    prompt: 'Questionário de qualificação de lead B2B: empresa, setor, número de funcionários, orçamento disponível, prazo de implementação, principais desafios',
  },
];

export function NaturalLanguageMode({ onFieldsGenerated }: NaturalLanguageModeProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Por favor, descreva o formulário que pretende criar');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-form-schema', {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;

      if (data?.fields && Array.isArray(data.fields)) {
        onFieldsGenerated(data.fields);
        toast.success('Formulário gerado com sucesso!');
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Error generating form:', error);
      toast.error('Erro ao gerar formulário. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Quero um formulário de pedido de orçamento para serviços de marketing.&#10;&#10;Perguntar nome, email, empresa, tipo de serviço, orçamento mensal e urgência."
          className="min-h-[150px] resize-none"
        />
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A gerar formulário...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar formulário com IA
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Exemplos de prompts
        </p>
        <div className="grid gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <Card
              key={example.title}
              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleExampleClick(example.prompt)}
            >
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="flex-shrink-0">
                  {example.title}
                </Badge>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {example.prompt}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
