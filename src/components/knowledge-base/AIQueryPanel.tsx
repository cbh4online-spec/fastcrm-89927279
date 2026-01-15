import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Send, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  User,
  Bot,
  Sparkles
} from 'lucide-react';
import { AIResponse, AIPersona } from '@/types/knowledge-base';
import { cn } from '@/lib/utils';

interface AIQueryPanelProps {
  personas: AIPersona[];
  onQuery: (query: string, context: string, options?: { personaId?: string }) => Promise<AIResponse | null>;
  context?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  needsHumanReview?: boolean;
  timestamp: Date;
}

export function AIQueryPanel({ 
  personas,
  onQuery,
  context = 'test'
}: AIQueryPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const response = await onQuery(query, context, { personaId: selectedPersonaId });

      if (response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.response,
          confidence: response.confidence,
          needsHumanReview: response.needsHumanReview,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error querying:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activePersonas = personas.filter(p => p.isActive);

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Testar IA
          </span>
          {activePersonas.length > 0 && (
            <select
              className="text-sm border rounded px-2 py-1"
              value={selectedPersonaId || ''}
              onChange={(e) => setSelectedPersonaId(e.target.value || undefined)}
            >
              <option value="">Sem persona</option>
              {activePersonas.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Faz uma pergunta para testar a IA.</p>
              <p className="text-sm mt-1">
                A resposta será baseada no conhecimento validado.
              </p>
            </div>
          )}

          {messages.map((message, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2">
                    {message.confidence !== undefined && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          message.confidence >= 0.8 
                            ? "text-green-600 border-green-300" 
                            : message.confidence >= 0.6
                              ? "text-amber-600 border-amber-300"
                              : "text-red-600 border-red-300"
                        )}
                      >
                        {(message.confidence * 100).toFixed(0)}% confiança
                      </Badge>
                    )}
                    {message.needsHumanReview && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Revisão humana
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">A pensar...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escreve uma pergunta..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!query.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Info */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Esta resposta baseia-se em informação validada.
        </p>
      </CardContent>
    </Card>
  );
}
