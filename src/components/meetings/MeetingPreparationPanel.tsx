import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  Target,
  MessageSquare,
  ListChecks,
  Lightbulb,
  TrendingUp,
  User,
  ShoppingBag,
  HeadphonesIcon,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { Meeting } from '@/hooks/useMeetings';

interface MeetingPreparation {
  id?: string;
  meeting_id: string;
  client_summary: string;
  last_interactions_summary: string;
  purchase_summary: string;
  tickets_summary: string;
  suggested_objective: string;
  suggested_questions: string[];
  risk_alerts: string[];
  suggested_agenda: string[];
  talking_points: string[];
  opportunities_to_explore: string[];
  saved?: boolean;
}

interface MeetingPreparationPanelProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingPreparationPanel({ meeting, isOpen, onClose }: MeetingPreparationPanelProps) {
  const [preparation, setPreparation] = useState<MeetingPreparation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    objective: true,
    questions: true,
    agenda: true,
    risks: true,
    opportunities: false,
  });
  const { currentWorkspace } = useWorkspace();

  const generatePreparation = async () => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('productivity-coach', {
        body: {
          action: 'prepare-meeting',
          workspaceId: currentWorkspace.id,
          data: { meetingId: meeting.id },
        },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setPreparation(data);
      toast.success('Preparação gerada com sucesso!');
    } catch (error) {
      console.error('Error generating preparation:', error);
      toast.error('Erro ao gerar preparação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !preparation && !isLoading) {
      generatePreparation();
    }
  }, [isOpen, meeting.id]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background border-l shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Preparação IA</h2>
              <p className="text-sm text-muted-foreground">{meeting.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generatePreparation}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              {isLoading ? 'A gerar...' : 'Regenerar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>

        {/* Meeting Info */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {format(new Date(meeting.start_time), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt })}
            </Badge>
            {meeting.contact && (
              <Badge variant="outline">
                <User className="h-3 w-3 mr-1" />
                {meeting.contact.name}
              </Badge>
            )}
            {meeting.company && (
              <span className="text-muted-foreground">{meeting.company.name}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : preparation ? (
              <>
                {/* Client Summary */}
                <PreparationSection
                  title="Resumo do Cliente"
                  icon={User}
                  isOpen={expandedSections.summary}
                  onToggle={() => toggleSection('summary')}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {preparation.client_summary}
                  </p>
                  
                  {preparation.last_interactions_summary && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">
                        Últimas Interações
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {preparation.last_interactions_summary}
                      </p>
                    </div>
                  )}

                  {preparation.purchase_summary && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2 flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        Compras
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {preparation.purchase_summary}
                      </p>
                    </div>
                  )}

                  {preparation.tickets_summary && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2 flex items-center gap-1">
                        <HeadphonesIcon className="h-3 w-3" />
                        Tickets/Suporte
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {preparation.tickets_summary}
                      </p>
                    </div>
                  )}
                </PreparationSection>

                {/* Risk Alerts */}
                {preparation.risk_alerts && preparation.risk_alerts.length > 0 && preparation.risk_alerts[0] && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Alertas de Risco
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {preparation.risk_alerts.filter(Boolean).map((alert, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <span>{alert}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Suggested Objective */}
                {preparation.suggested_objective && (
                  <PreparationSection
                    title="Objetivo Sugerido"
                    icon={Target}
                    isOpen={expandedSections.objective}
                    onToggle={() => toggleSection('objective')}
                    highlight
                  >
                    <p className="text-sm font-medium">{preparation.suggested_objective}</p>
                  </PreparationSection>
                )}

                {/* Suggested Agenda */}
                <PreparationSection
                  title="Agenda Proposta"
                  icon={ListChecks}
                  isOpen={expandedSections.agenda}
                  onToggle={() => toggleSection('agenda')}
                >
                  <ol className="space-y-2">
                    {preparation.suggested_agenda?.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </PreparationSection>

                {/* Suggested Questions */}
                <PreparationSection
                  title="Perguntas Estratégicas"
                  icon={MessageSquare}
                  isOpen={expandedSections.questions}
                  onToggle={() => toggleSection('questions')}
                >
                  <ul className="space-y-2">
                    {preparation.suggested_questions?.map((question, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold">?</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </PreparationSection>

                {/* Talking Points */}
                {preparation.talking_points && preparation.talking_points.length > 0 && (
                  <PreparationSection
                    title="Pontos a Abordar"
                    icon={Lightbulb}
                    isOpen={expandedSections.talking}
                    onToggle={() => toggleSection('talking')}
                  >
                    <ul className="space-y-2">
                      {preparation.talking_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </PreparationSection>
                )}

                {/* Opportunities */}
                {preparation.opportunities_to_explore && preparation.opportunities_to_explore.length > 0 && (
                  <PreparationSection
                    title="Oportunidades a Explorar"
                    icon={TrendingUp}
                    isOpen={expandedSections.opportunities}
                    onToggle={() => toggleSection('opportunities')}
                  >
                    <ul className="space-y-2">
                      {preparation.opportunities_to_explore.map((opp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </PreparationSection>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Clique em "Regenerar" para gerar a preparação
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface PreparationSectionProps {
  title: string;
  icon: typeof User;
  isOpen: boolean;
  onToggle: () => void;
  highlight?: boolean;
  children: React.ReactNode;
}

function PreparationSection({ title, icon: Icon, isOpen, onToggle, highlight, children }: PreparationSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={cn(highlight && "border-primary/50 bg-primary/5")}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {title}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
    </div>
  );
}
