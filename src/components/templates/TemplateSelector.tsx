import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTemplates,
  Template,
  TemplateType,
  TemplateGoal,
} from '@/hooks/useTemplates';
import { useApplyTemplate } from '@/hooks/useTemplateActivity';
import {
  validateTemplate,
  renderTemplate,
  VariableContext,
  getExampleContext,
} from '@/lib/templateVariables';
import { TemplateValidationDialog } from '@/components/templates/TemplateValidationDialog';
import {
  FileText,
  Search,
  Star,
  Clock,
  Sparkles,
  Mail,
  MessageCircle,
  Instagram,
  Smartphone,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface TemplateRecommendation {
  template: Template;
  score: number;
  reasons: string[];
}

interface TemplateSelectorProps {
  entityType: 'lead' | 'opportunity' | 'contact' | 'company';
  entityId: string;
  entityData: VariableContext;
  channel?: string;
  stage?: string;
  status?: string;
  goal?: TemplateGoal;
  onApply: (renderedContent: string, renderedSubject?: string, template?: Template) => void;
  onAIPersonalize?: (template: Template, context: VariableContext) => void;
  trigger?: React.ReactNode;
}

const typeConfig: Record<TemplateType, { icon: React.ElementType; color: string }> = {
  email: { icon: Mail, color: 'text-blue-500' },
  whatsapp: { icon: MessageCircle, color: 'text-green-500' },
  instagram_dm: { icon: Instagram, color: 'text-pink-500' },
  proposal: { icon: FileText, color: 'text-purple-500' },
  sms: { icon: Smartphone, color: 'text-amber-500' },
};

const goalLabels: Record<TemplateGoal, string> = {
  qualification: 'Qualificação',
  follow_up: 'Follow-up',
  booking: 'Agendamento',
  closing: 'Fecho',
  support: 'Suporte',
  other: 'Outro',
};

// Compute recommendation score
function computeRecommendationScore(
  template: Template,
  context: {
    entityType: string;
    channel?: string;
    stage?: string;
    status?: string;
    goal?: TemplateGoal;
  }
): TemplateRecommendation {
  let score = 0;
  const reasons: string[] = [];
  
  // Compatible module match
  if (template.compatible_modules?.includes(context.entityType)) {
    score += 30;
    reasons.push(`Compatível com ${context.entityType}`);
  }
  
  // Channel match
  if (context.channel) {
    const channelToType: Record<string, TemplateType> = {
      whatsapp: 'whatsapp',
      instagram: 'instagram_dm',
      email: 'email',
      sms: 'sms',
    };
    if (channelToType[context.channel] === template.type) {
      score += 40;
      reasons.push('Canal correspondente');
    }
  }
  
  // Goal match
  if (context.goal && template.goal === context.goal) {
    score += 25;
    reasons.push(`Objetivo: ${goalLabels[context.goal]}`);
  }
  
  // Status-based recommendations
  if (context.status) {
    if (context.status === 'new' && template.goal === 'qualification') {
      score += 15;
      reasons.push('Ideal para novos leads');
    }
    if (context.status === 'in_progress' && template.goal === 'follow_up') {
      score += 15;
      reasons.push('Bom para follow-up');
    }
  }
  
  // Stage-based recommendations
  if (context.stage) {
    const stageLower = context.stage.toLowerCase();
    if ((stageLower.includes('negoci') || stageLower.includes('proposta')) && template.goal === 'closing') {
      score += 20;
      reasons.push('Adequado para negociação');
    }
    if (stageLower.includes('qualific') && template.goal === 'qualification') {
      score += 20;
      reasons.push('Ideal para qualificação');
    }
  }
  
  // Favorite boost
  if (template.is_favorite) {
    score += 10;
    reasons.push('Favorito');
  }
  
  // Usage-based boost (popular templates)
  if (template.usage_count > 10) {
    score += 5;
    reasons.push('Muito usado');
  }
  
  // Reply rate boost
  if (template.reply_rate && template.reply_rate > 0.3) {
    score += 10;
    reasons.push('Alta taxa de resposta');
  }
  
  return { template, score, reasons };
}

export function TemplateSelector({
  entityType,
  entityId,
  entityData,
  channel,
  stage,
  status,
  goal,
  onApply,
  onAIPersonalize,
  trigger,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'favorites'>('recommended');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  
  const { data: templates = [], isLoading } = useTemplates({ isActive: true });
  const applyTemplate = useApplyTemplate();
  
  // Compute recommendations
  const recommendations = useMemo(() => {
    const context = { entityType, channel, stage, status, goal };
    return templates
      .map(t => computeRecommendationScore(t, context))
      .sort((a, b) => b.score - a.score);
  }, [templates, entityType, channel, stage, status, goal]);
  
  // Filter by search
  const filteredTemplates = useMemo(() => {
    if (!search) return recommendations;
    const searchLower = search.toLowerCase();
    return recommendations.filter(
      r =>
        r.template.name.toLowerCase().includes(searchLower) ||
        r.template.description?.toLowerCase().includes(searchLower) ||
        r.template.tags?.some(t => t.toLowerCase().includes(searchLower))
    );
  }, [recommendations, search]);
  
  // Get top recommendations
  const topRecommendations = filteredTemplates.filter(r => r.score >= 30).slice(0, 5);
  const favorites = filteredTemplates.filter(r => r.template.is_favorite);
  
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setValidationOpen(true);
  };
  
  const handleApplyValidated = async (
    renderedContent: string,
    renderedSubject?: string,
    variablesUsed?: Record<string, string>
  ) => {
    if (!selectedTemplate) return;
    
    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        templateType: selectedTemplate.type,
        entityType,
        entityId,
        renderedContent,
        renderedSubject,
        variablesUsed: variablesUsed || {},
      });
      
      onApply(renderedContent, renderedSubject, selectedTemplate);
      setValidationOpen(false);
      setOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleAIPersonalize = (template: Template) => {
    if (onAIPersonalize) {
      onAIPersonalize(template, entityData);
      setOpen(false);
    }
  };
  
  const renderTemplateCard = (rec: TemplateRecommendation, showScore = false) => {
    const { template, score, reasons } = rec;
    const TypeIcon = typeConfig[template.type]?.icon || FileText;
    const validation = validateTemplate(template.content, entityData);
    
    return (
      <Card
        key={template.id}
        className={cn(
          'cursor-pointer hover:border-primary/50 transition-colors',
          showScore && score >= 50 && 'border-primary/30 bg-primary/5'
        )}
        onClick={() => handleSelectTemplate(template)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg bg-muted', typeConfig[template.type]?.color)}>
              <TypeIcon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">{template.name}</h4>
                {template.is_favorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              </div>
              
              {template.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {template.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">
                  {goalLabels[template.goal]}
                </Badge>
                
                {showScore && score >= 30 && (
                  <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30">
                    <TrendingUp className="h-2.5 w-2.5" />
                    {score}% match
                  </Badge>
                )}
                
                {validation.unresolvedVariables.length > 0 ? (
                  <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {validation.unresolvedVariables.length} var
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-300">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Pronto
                  </Badge>
                )}
              </div>
              
              {showScore && reasons.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {reasons.slice(0, 2).join(' • ')}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectTemplate(template);
                }}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              {onAIPersonalize && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-purple-500 hover:text-purple-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAIPersonalize(template);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </Button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-[450px] sm:max-w-md p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Selecionar Template
            </SheetTitle>
          </SheetHeader>
          
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Procurar templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
            <div className="px-4 border-b">
              <TabsList className="h-9">
                <TabsTrigger value="recommended" className="text-xs gap-1">
                  <Zap className="h-3 w-3" />
                  Recomendados
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="favorites" className="text-xs gap-1">
                  <Star className="h-3 w-3" />
                  Favoritos
                </TabsTrigger>
              </TabsList>
            </div>
            
            <ScrollArea className="h-[calc(100vh-220px)]">
              <TabsContent value="recommended" className="p-4 space-y-3 mt-0">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                ) : topRecommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem recomendações</p>
                    <p className="text-xs">Experimenta a aba "Todos"</p>
                  </div>
                ) : (
                  topRecommendations.map(rec => renderTemplateCard(rec, true))
                )}
              </TabsContent>
              
              <TabsContent value="all" className="p-4 space-y-3 mt-0">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem templates</p>
                  </div>
                ) : (
                  filteredTemplates.map(rec => renderTemplateCard(rec))
                )}
              </TabsContent>
              
              <TabsContent value="favorites" className="p-4 space-y-3 mt-0">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                ) : favorites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem favoritos</p>
                  </div>
                ) : (
                  favorites.map(rec => renderTemplateCard(rec))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
      
      {/* Validation Dialog */}
      {selectedTemplate && (
        <TemplateValidationDialog
          open={validationOpen}
          onOpenChange={setValidationOpen}
          content={selectedTemplate.content}
          subject={selectedTemplate.subject || undefined}
          context={entityData}
          onApply={handleApplyValidated}
          isApplying={applyTemplate.isPending}
        />
      )}
    </>
  );
}
