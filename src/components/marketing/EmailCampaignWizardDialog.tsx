import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, Copy, Loader2, AlertCircle, Coins, Paintbrush } from 'lucide-react';
import { toast } from 'sonner';
import { useCreditWallet } from '@/hooks/useCreditWallet';
import { triggerNoCreditsDialog } from '@/hooks/useNoCreditsDialog';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const ACTION_KEY = 'ai_email_campaign_wizard';

interface EmailCampaignWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenEditor?: (html: string) => void;
}

export function EmailCampaignWizardDialog({ open, onOpenChange, onOpenEditor }: EmailCampaignWizardDialogProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [creditsConsumed, setCreditsConsumed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canAfford, getCost, consumeCredits, balance } = useCreditWallet();

  const cost = getCost(ACTION_KEY);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput('');
      setCreditsConsumed(false);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-campaign-wizard`;
    
    // Get user JWT for auth
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
      if (resp.status === 429) {
        toast.error('Rate limit excedido. Tenta novamente em breve.');
      } else if (resp.status === 402) {
        toast.error('Créditos insuficientes.');
      } else {
        toast.error(err.error || 'Erro ao comunicar com a IA');
      }
      throw new Error(err.error);
    }

    if (!resp.body) throw new Error('No body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantSoFar = '';

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    let done = false;
    while (!done) {
      const { done: readerDone, value } = await reader.read();
      if (readerDone) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') { done = true; break; }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) upsert(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Consume credits on first message
    if (!creditsConsumed) {
      if (!canAfford(ACTION_KEY)) {
        triggerNoCreditsDialog({ actionLabel: 'Assistente de Campanhas IA' });
        return;
      }
      try {
        await consumeCredits.mutateAsync({ actionKey: ACTION_KEY, referenceType: 'email_campaign_wizard' });
        setCreditsConsumed(true);
      } catch (e) {
        console.error('Credit consumption failed:', e);
        return;
      }
    }

    const userMsg: Msg = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsStreaming(true);

    try {
      await streamChat(updated);
    } catch (e) {
      console.error('Stream error:', e);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const extractCampaignJSON = (content: string) => {
    const match = content.match(/---CAMPANHA_GERADA---\s*([\s\S]*?)\s*---FIM_CAMPANHA---/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
  };

  const copyCampaign = (content: string) => {
    const data = extractCampaignJSON(content);
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success('Campanha copiada para a área de transferência');
    }
  };

  const copyHtml = (content: string) => {
    const data = extractCampaignJSON(content);
    if (data?.body_html) {
      navigator.clipboard.writeText(data.body_html);
      toast.success('HTML do email copiado');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente de Campanhas IA
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-3.5 w-3.5" />
            <span>{cost} créditos · Saldo: {balance}</span>
            {creditsConsumed && <Badge variant="secondary" className="text-xs">Créditos consumidos</Badge>}
          </div>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <Sparkles className="h-10 w-10 text-primary/40 mx-auto" />
                <h3 className="font-semibold text-lg">Vamos criar a tua campanha!</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Descreve o que pretendes — vender um produto, nutrir leads, lançar uma novidade — e eu trato do resto.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {[
                    'Quero promover um novo serviço',
                    'Reactivar clientes inativos',
                    'Lançar um produto',
                    'Campanha de Black Friday',
                  ].map(s => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setInput(s); }}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const hasCampaign = msg.role === 'assistant' && extractCampaignJSON(msg.content);
              // Clean displayed content by removing the JSON block
              const displayContent = msg.content
                .replace(/---CAMPANHA_GERADA---[\s\S]*?---FIM_CAMPANHA---/, '')
                .trim();

              return (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{displayContent || '...'}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {hasCampaign && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => copyCampaign(msg.content)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar JSON
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => copyHtml(msg.content)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar HTML
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreve o objectivo da tua campanha..."
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="shrink-0"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {!creditsConsumed && messages.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Ao enviar a primeira mensagem serão consumidos {cost} créditos
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
