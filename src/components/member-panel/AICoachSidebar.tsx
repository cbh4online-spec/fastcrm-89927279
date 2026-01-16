import { useState } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Lightbulb, 
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  Send,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Tip {
  id: string;
  type: 'insight' | 'tip' | 'recommendation';
  title: string;
  message: string;
  icon: typeof Lightbulb;
}

interface AICoachSidebarProps {
  className?: string;
}

export function AICoachSidebar({ className }: AICoachSidebarProps) {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Demo tips - in production these would come from AI
  const tips: Tip[] = [
    {
      id: '1',
      type: 'insight',
      title: 'Melhor hora para follow-ups',
      message: 'Hoje tens mais tempo livre entre as 16h e 17h. Sugiro fazer follow-ups nesse horário.',
      icon: Clock,
    },
    {
      id: '2',
      type: 'tip',
      title: 'Oportunidade de upsell',
      message: 'O cliente ABC não usa o módulo Premium. Taxa de conversão de 65% para este perfil.',
      icon: TrendingUp,
    },
    {
      id: '3',
      type: 'recommendation',
      title: 'Foco da semana',
      message: 'Fechar o negócio XYZ tem maior impacto na meta mensal. Prioriza este caso.',
      icon: Target,
    },
  ];

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    // In production, this would call the AI
    setTimeout(() => {
      setIsAsking(false);
      setQuestion('');
    }, 1500);
  };

  return (
    <Card className={cn("border-0 shadow-lg h-full flex flex-col", className)}>
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Coach IA
              <Badge variant="secondary" className="text-[10px]">Beta</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">O teu assistente pessoal</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Tips Section */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Insights do dia</span>
            </div>

            {tips.map((tip) => {
              const Icon = tip.icon;
              return (
                <div
                  key={tip.id}
                  className="p-3 rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 hover:from-muted/70 hover:to-muted/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium truncate">{tip.title}</h4>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tip.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Ações rápidas</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-auto py-2 px-3 justify-start">
                <div className="text-left">
                  <p className="text-xs font-medium">Resumo do dia</p>
                  <p className="text-[10px] text-muted-foreground">Ver overview</p>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3 justify-start">
                <div className="text-left">
                  <p className="text-xs font-medium">Próxima ação</p>
                  <p className="text-[10px] text-muted-foreground">O que fazer?</p>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3 justify-start">
                <div className="text-left">
                  <p className="text-xs font-medium">Preparar reunião</p>
                  <p className="text-[10px] text-muted-foreground">Briefing IA</p>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2 px-3 justify-start">
                <div className="text-left">
                  <p className="text-xs font-medium">Analisar meta</p>
                  <p className="text-[10px] text-muted-foreground">Projeção</p>
                </div>
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Ask AI Section */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Perguntar ao Coach IA..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                className="pl-10 pr-4 bg-background"
              />
            </div>
            <Button 
              size="icon" 
              onClick={handleAsk}
              disabled={!question.trim() || isAsking}
            >
              <Send className={cn("h-4 w-4", isAsking && "animate-pulse")} />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            A IA aprende com as tuas ações para melhorar sugestões
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
