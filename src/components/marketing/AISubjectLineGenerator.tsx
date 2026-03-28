import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Check, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISubjectLineGeneratorProps {
  emailContent: string;
  campaignName: string;
  onSelect: (subject: string) => void;
}

interface SubjectVariant {
  subject: string;
  score: number;
  reason: string;
}

export function AISubjectLineGenerator({ emailContent, campaignName, onSelect }: AISubjectLineGeneratorProps) {
  const [variants, setVariants] = useState<SubjectVariant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke('marketing-ai-copilot', {
        body: {
          action: 'generate_subjects',
          campaignName,
          emailContent: emailContent.substring(0, 2000),
        },
      });

      if (error) throw error;

      if (data?.variants) {
        setVariants(data.variants);
      }
    } catch (err) {
      console.error('Error generating subjects:', err);
      toast.error('Erro ao gerar assuntos');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Gerar com IA
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Sugestões de Assunto
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-7 gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
          Regenerar
        </Button>
      </div>

      {isGenerating ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">A gerar variantes...</span>
        </div>
      ) : variants.length > 0 ? (
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-md border bg-background hover:bg-accent/50 cursor-pointer transition-colors group"
              onClick={() => {
                onSelect(v.subject);
                toast.success('Assunto aplicado');
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.subject}</p>
                <p className="text-[10px] text-muted-foreground">{v.reason}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {v.score}/100
              </Badge>
              <Check className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            💡 Dica: Use a variante mais forte como assunto e a segunda para teste A/B
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Clique em "Regenerar" para gerar sugestões
        </p>
      )}
    </div>
  );
}
