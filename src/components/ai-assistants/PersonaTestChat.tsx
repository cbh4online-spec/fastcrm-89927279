import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import { usePersonaChat } from '@/hooks/useAIPersonas';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface PersonaTestChatProps {
  personaId: string;
  personaName: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
}

export function PersonaTestChat({ personaId, personaName }: PersonaTestChatProps) {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const chatMutation = usePersonaChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentWorkspace) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    try {
      const result = await chatMutation.mutateAsync({
        personaId,
        workspaceId: currentWorkspace.id,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message,
        tokens: result.tokens_used,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro ao gerar resposta. Tenta novamente.',
      }]);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Testar {personaName}</CardTitle>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMessages([])}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[240px] pr-2">
          <div className="space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Envia uma mensagem para testar a persona
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
                <div className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  {msg.tokens && (
                    <p className="text-[10px] opacity-60 mt-1">{msg.tokens} tokens</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Escreve uma mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={chatMutation.isPending}
            className="text-sm"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
