import { useState, useRef, useEffect, useCallback } from 'react';
import { FlowSimulator, SimResponse, SimStatus } from '@/lib/flow-simulator';
import { FlowStep, FlowVariable } from '@/types/conversational-flows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, RotateCcw, Send, ChevronDown, ChevronUp, Bot, User, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowDryRunPanelProps {
  steps: FlowStep[];
  variables: FlowVariable[];
  onClose: () => void;
  onStepHighlight: (stepId: string | null) => void;
}

export function FlowDryRunPanel({ steps, variables, onClose, onStepHighlight }: FlowDryRunPanelProps) {
  const [simulator] = useState(() => new FlowSimulator(steps, variables));
  const [responses, setResponses] = useState<SimResponse[]>([]);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [collectedVars, setCollectedVars] = useState<Record<string, unknown>>({});
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showVars, setShowVars] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start simulation on mount
  useEffect(() => {
    const result = simulator.start();
    setResponses(result.responses);
    setStatus(result.status);
    setCollectedVars(result.collectedVars);
    setCurrentStepId(result.currentStepId);
    onStepHighlight(result.currentStepId);
  }, [simulator, onStepHighlight]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses]);

  // Focus input when waiting
  useEffect(() => {
    if (status === 'waiting_input') {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || status !== 'waiting_input') return;
    const result = simulator.sendMessage(inputValue.trim());
    setResponses(result.responses);
    setStatus(result.status);
    setCollectedVars(result.collectedVars);
    setCurrentStepId(result.currentStepId);
    onStepHighlight(result.currentStepId);
    setInputValue('');
  }, [inputValue, status, simulator, onStepHighlight]);

  const handleRestart = useCallback(() => {
    const sim = new FlowSimulator(steps, variables);
    const result = sim.start();
    setResponses(result.responses);
    setStatus(result.status);
    setCollectedVars(result.collectedVars);
    setCurrentStepId(result.currentStepId);
    onStepHighlight(result.currentStepId);
    setInputValue('');
  }, [steps, variables, onStepHighlight]);

  const handleClose = useCallback(() => {
    onStepHighlight(null);
    onClose();
  }, [onClose, onStepHighlight]);

  const varsCount = Object.keys(collectedVars).length;
  const isFinished = status === 'completed' || status === 'handed_off' || status === 'error';

  const currentStep = currentStepId ? steps.find(s => s.id === currentStepId) : null;

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Dry Run</Badge>
          {currentStep && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {currentStep.name}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRestart} title="Reiniciar">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose} title="Fechar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
        {responses.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'bot' && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'rounded-lg px-3 py-2 text-sm max-w-[85%]',
                msg.role === 'bot' && 'bg-muted text-foreground',
                msg.role === 'user' && 'bg-primary text-primary-foreground',
                msg.role === 'system' && 'bg-accent/50 text-accent-foreground text-xs italic border'
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Final status */}
        {isFinished && (
          <div className="text-center py-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {status === 'completed' && `✅ Flow completado — ${varsCount} variáve${varsCount !== 1 ? 'is' : 'l'} recolhida${varsCount !== 1 ? 's' : ''}`}
              {status === 'handed_off' && '👤 Conversa transferida para agente humano'}
              {status === 'error' && '❌ Simulação terminada com erro'}
            </p>
            <Button variant="outline" size="sm" onClick={handleRestart}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
            </Button>
          </div>
        )}
      </div>

      {/* Variables panel */}
      {varsCount > 0 && (
        <div className="border-t">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50"
            onClick={() => setShowVars(!showVars)}
          >
            <span className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Variáveis ({varsCount})
            </span>
            {showVars ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          {showVars && (
            <div className="px-3 pb-2 space-y-1">
              {Object.entries(collectedVars).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-mono truncate max-w-[140px]">{String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={status === 'waiting_input' ? 'Escreve a tua resposta...' : 'Aguarda...'}
            disabled={status !== 'waiting_input'}
            className="text-sm h-9"
          />
          <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={status !== 'waiting_input'}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
