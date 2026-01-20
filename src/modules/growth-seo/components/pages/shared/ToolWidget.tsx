import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTracking } from '../../../hooks/useTracking';

interface ToolWidgetProps {
  toolId: string;
  toolName: string;
  placeholder?: string;
  maxInputLength?: number;
  showPreview?: boolean;
  className?: string;
}

export function ToolWidget({ 
  toolId,
  toolName,
  placeholder = 'Introduza o seu texto aqui...',
  maxInputLength = 500,
  showPreview = true,
  className = '' 
}: ToolWidgetProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { trackToolRunStarted, trackToolRunCompleted, trackCTAClick } = useTracking();

  const handleRun = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    trackToolRunStarted({ tool_name: toolId, input_type: 'text' });

    try {
      // Simulate a quick preview result
      // In production, this would call an edge function
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock preview result
      const mockResult = `Resultado de exemplo para "${input.slice(0, 50)}..."`;
      setResult(mockResult);
      
      trackToolRunCompleted({ 
        tool_name: toolId, 
        result_type: 'preview',
      });
    } catch (error) {
      console.error('Tool run failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCTAClick = () => {
    trackCTAClick({
      cta_type: 'signup',
      placement: 'inline',
      page_type: 'tool',
      entity_slug: toolId,
    });
  };

  return (
    <Card className={`p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Experimenta agora: {toolName}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, maxInputLength))}
            placeholder={placeholder}
            className="min-h-[100px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {input.length}/{maxInputLength}
          </p>
        </div>

        <Button 
          onClick={handleRun} 
          disabled={isLoading || !input.trim()}
          className="w-full gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              A processar...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar resultado
            </>
          )}
        </Button>

        {result && showPreview && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Resultado (preview)</span>
              <span className="text-xs text-muted-foreground">Limitado</span>
            </div>
            <p className="text-sm">{result}</p>
            
            <div className="mt-4 p-3 bg-background rounded border border-dashed flex items-center gap-3">
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Quer o resultado completo?</p>
                <p className="text-xs text-muted-foreground">Crie uma conta gratuita para desbloquear.</p>
              </div>
              <Link to="/auth" onClick={handleCTAClick}>
                <Button size="sm">Criar conta</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
