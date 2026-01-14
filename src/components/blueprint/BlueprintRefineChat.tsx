import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Send, Bot, User, Check, X } from 'lucide-react';
import { CrmBlueprint, BlueprintClarifyingQuestion } from '@/types/blueprint';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversationEntry {
  question: string;
  answer: string;
}

interface Message {
  id: string;
  type: 'question' | 'answer' | 'system';
  content: string;
}

interface RefineResponse {
  isComplete: boolean;
  question: BlueprintClarifyingQuestion | null;
  updatedBlueprint: CrmBlueprint;
  reasoning?: string;
}

interface BlueprintRefineChatProps {
  blueprint: CrmBlueprint;
  onBlueprintUpdated: (blueprint: CrmBlueprint) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export function BlueprintRefineChat({
  blueprint,
  onBlueprintUpdated,
  onComplete,
  onCancel,
}: BlueprintRefineChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<BlueprintClarifyingQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const callRefineAPI = useCallback(async (latestAnswer?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refine-blueprint', {
        body: {
          blueprint,
          conversationHistory,
          latestAnswer,
        },
      });

      if (error) throw error;

      const response = data as RefineResponse;

      // Update blueprint if changed
      if (response.updatedBlueprint) {
        onBlueprintUpdated(response.updatedBlueprint);
      }

      if (response.isComplete) {
        setIsComplete(true);
        setCurrentQuestion(null);
        setMessages(prev => [
          ...prev,
          {
            id: `complete-${Date.now()}`,
            type: 'system',
            content: 'O Blueprint está completo! Podes pré-visualizar e aplicar as alterações.',
          },
        ]);
      } else if (response.question) {
        setCurrentQuestion(response.question);
        setMessages(prev => [
          ...prev,
          {
            id: `q-${response.question!.id}`,
            type: 'question',
            content: response.question!.question,
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error refining blueprint:', error);
      if (error.message?.includes('429')) {
        toast.error('Limite de pedidos excedido. Tente novamente mais tarde.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos AI esgotados.');
      } else {
        toast.error('Erro ao refinar blueprint.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [blueprint, conversationHistory, onBlueprintUpdated]);

  // Start conversation on mount
  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      setMessages([
        {
          id: 'intro',
          type: 'system',
          content: 'Vou fazer-te algumas perguntas rápidas para refinar o teu Blueprint.',
        },
      ]);
      callRefineAPI();
    }
  }, [hasStarted, callRefineAPI]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) return;

    // Get display text for the answer
    let answerDisplay = '';
    if (currentQuestion.type === 'text') {
      answerDisplay = currentAnswer as string;
    } else if (currentQuestion.options) {
      if (Array.isArray(currentAnswer)) {
        answerDisplay = currentAnswer
          .map((v) => currentQuestion.options?.find((o) => o.value === v)?.label || v)
          .join(', ');
      } else {
        answerDisplay = currentQuestion.options.find((o) => o.value === currentAnswer)?.label || (currentAnswer as string);
      }
    }

    // Add answer to messages
    setMessages(prev => [
      ...prev,
      {
        id: `a-${currentQuestion.id}`,
        type: 'answer',
        content: answerDisplay,
      },
    ]);

    // Update conversation history
    const newHistory = [
      ...conversationHistory,
      { question: currentQuestion.question, answer: answerDisplay },
    ];
    setConversationHistory(newHistory);

    // Reset current answer and call API
    setCurrentAnswer('');
    setCurrentQuestion(null);
    await callRefineAPI(answerDisplay);
  };

  const handleSingleSelect = (value: string) => {
    setCurrentAnswer(value);
  };

  const handleMultipleSelect = (value: string, checked: boolean) => {
    const current = (Array.isArray(currentAnswer) ? currentAnswer : []) as string[];
    if (checked) {
      setCurrentAnswer([...current, value]);
    } else {
      setCurrentAnswer(current.filter((v) => v !== value));
    }
  };

  const hasValidAnswer = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.type === 'text') return typeof currentAnswer === 'string' && currentAnswer.trim().length > 0;
    if (currentQuestion.type === 'multiple') return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    return typeof currentAnswer === 'string' && currentAnswer.length > 0;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Refinar Blueprint
          </CardTitle>
          <Badge variant="secondary" className="font-normal">
            {conversationHistory.length} / 7 perguntas
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Responde a algumas perguntas para personalizar o CRM ao teu negócio.
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {/* Chat messages */}
        <ScrollArea className="h-[320px] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'answer' ? 'justify-end' : ''}`}
              >
                {message.type === 'question' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                {message.type === 'system' && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    message.type === 'answer'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : message.type === 'system'
                      ? 'bg-muted/50 text-muted-foreground rounded-tl-sm italic'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                {message.type === 'answer' && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator when loading */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-4 bg-muted/30">
          {!isComplete && currentQuestion ? (
            <div className="space-y-3">
              {/* Single select options */}
              {currentQuestion.type === 'single' && currentQuestion.options && (
                <RadioGroup
                  value={currentAnswer as string}
                  onValueChange={handleSingleSelect}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {currentQuestion.options.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        currentAnswer === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSingleSelect(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={`refine-${option.value}`} />
                      <Label htmlFor={`refine-${option.value}`} className="cursor-pointer flex-1 text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Multiple select options */}
              {currentQuestion.type === 'multiple' && currentQuestion.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentQuestion.options.map((option) => {
                    const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleMultipleSelect(option.value, !isChecked)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleMultipleSelect(option.value, !!checked)}
                        />
                        <Label className="cursor-pointer flex-1 text-sm">{option.label}</Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Text input */}
              {currentQuestion.type === 'text' && (
                <Textarea
                  value={currentAnswer as string}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Escreve a tua resposta..."
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && hasValidAnswer()) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!hasValidAnswer() || isLoading}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : isComplete ? (
            <div className="flex gap-2">
              <Button onClick={onComplete} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Concluir Refinamento
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Descartar Alterações
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">A analisar blueprint...</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
