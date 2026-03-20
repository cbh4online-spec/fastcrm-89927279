import { useState, useRef } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TONES = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'casual', label: 'Casual' },
  { value: 'persuasivo', label: 'Persuasivo' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'conciso', label: 'Conciso' },
] as const;

interface AIRewritePanelProps {
  currentText: string;
  onApply: (newText: string) => void;
}

export function AIRewritePanel({ currentText, onApply }: AIRewritePanelProps) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<string>('profissional');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!currentText.trim()) {
      toast.error('Sem texto para reescrever');
      return;
    }

    setLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('email-ai-rewrite', {
        body: { text: currentText, tone, count: 3 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error('AI rewrite error:', err);
      toast.error(err.message || 'Erro ao gerar sugestões');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3 w-3" />
        Reescrever com IA
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          Reescrever com IA
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setOpen(false); setSuggestions([]); }}>
          Fechar
        </Button>
      </div>

      {/* Tone selector */}
      <div className="flex flex-wrap gap-1.5">
        {TONES.map((t) => (
          <Badge
            key={t.value}
            variant={tone === t.value ? 'default' : 'outline'}
            className="cursor-pointer text-[10px] px-2 py-0.5"
            onClick={() => setTone(t.value)}
          >
            {t.label}
          </Badge>
        ))}
      </div>

      <Button
        size="sm"
        className="w-full h-8 text-xs"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />A gerar...</>
        ) : (
          'Gerar sugestões'
        )}
      </Button>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="border rounded-md p-2.5 bg-background text-xs leading-relaxed group relative">
              <p>{s}</p>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  onApply(s);
                  setOpen(false);
                  setSuggestions([]);
                  toast.success('Texto aplicado');
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
