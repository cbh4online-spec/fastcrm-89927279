import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useTemplates,
  Template,
  TemplateType,
  TemplateGoal,
} from '@/hooks/useTemplates';
import { useApplyTemplate } from '@/hooks/useTemplateActivity';
import {
  validateTemplate,
  VariableContext,
} from '@/lib/templateVariables';
import { TemplateValidationDialog } from '@/components/templates/TemplateValidationDialog';
import { AIPersonalizeDialog } from '@/components/templates/AIPersonalizeDialog';
import {
  FileText,
  Star,
  Sparkles,
  Mail,
  MessageCircle,
  Instagram,
  Smartphone,
  Send,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateRecommendation {
  template: Template;
  score: number;
  reasons: string[];
}

interface ContextualTemplatePanelProps {
  entityType: 'lead' | 'opportunity' | 'contact' | 'company';
  entityId: string;
  entityData: VariableContext;
  channel?: string;
  stage?: string;
  status?: string;
  goal?: TemplateGoal;
  onApply: (renderedContent: string, renderedSubject?: string, template?: Template) => void;
  onViewAll?: () => void;
  className?: string;
  maxVisible?: number;
}

const typeConfig: Record<TemplateType, { icon: React.ElementType; color: string; label: string }> = {
  email: { icon: Mail, color: 'text-blue-500', label: 'Email' },
  whatsapp: { icon: MessageCircle, color: 'text-green-500', label: 'WhatsApp' },
  instagram_dm: { icon: Instagram, color: 'text-pink-500', label: 'Instagram' },
  proposal: { icon: FileText, color: 'text-purple-500', label: 'Proposta' },
  sms: { icon: Smartphone, color: 'text-amber-500', label: 'SMS' },
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
  
  // Usage-based boost
  if (template.usage_count && template.usage_count > 10) {
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

export function ContextualTemplatePanel({
  entityType,
  entityId,
  entityData,
  channel,
  stage,
  status,
  goal,
  onApply,
  onViewAll,
  className,
  maxVisible = 3,
}: ContextualTemplatePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [aiPersonalizeOpen, setAIPersonalizeOpen] = useState(false);
  
  const { data: templates = [], isLoading } = useTemplates({ isActive: true });
  const applyTemplate = useApplyTemplate();
  
  // Compute recommendations
  const recommendations = useMemo(() => {
    const context = { entityType, channel, stage, status, goal };
    return templates
      .map(t => computeRecommendationScore(t, context))
      .filter(r => r.score >= 25) // Only show relevant templates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [templates, entityType, channel, stage, status, goal]);
  
  const visibleRecommendations = recommendations.slice(0, maxVisible);
  const hasMore = recommendations.length > maxVisible;
  
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setValidationOpen(true);
  };
  
  const handleAIPersonalize = (template: Template) => {
    setSelectedTemplate(template);
    setAIPersonalizeOpen(true);
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
      setSelectedTemplate(null);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleAIApply = async (personalizedContent: string) => {
    if (!selectedTemplate) return;
    
    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        templateType: selectedTemplate.type,
        entityType,
        entityId,
        renderedContent: personalizedContent,
        variablesUsed: { ai_personalized: 'true' },
      });
      
      onApply(personalizedContent, undefined, selectedTemplate);
      setAIPersonalizeOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Templates Recomendados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (recommendations.length === 0) {
    return null;
  }
  
  return (
    <>
      <Card className={cn("w-full", className)}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Templates Recomendados
                  <Badge variant="secondary" className="text-xs">
                    {recommendations.length}
                  </Badge>
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-2">
              {visibleRecommendations.map((rec) => (
                <TemplateCard
                  key={rec.template.id}
                  recommendation={rec}
                  entityData={entityData}
                  onSelect={handleSelectTemplate}
                  onAIPersonalize={handleAIPersonalize}
                />
              ))}
              
              {hasMore && onViewAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs gap-1"
                  onClick={onViewAll}
                >
                  Ver mais {recommendations.length - maxVisible} templates
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      
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
      
      {/* AI Personalize Dialog */}
      {selectedTemplate && (
        <AIPersonalizeDialog
          open={aiPersonalizeOpen}
          onOpenChange={setAIPersonalizeOpen}
          template={selectedTemplate}
          context={entityData}
          onApply={handleAIApply}
        />
      )}
    </>
  );
}

interface TemplateCardProps {
  recommendation: TemplateRecommendation;
  entityData: VariableContext;
  onSelect: (template: Template) => void;
  onAIPersonalize: (template: Template) => void;
}

function TemplateCard({
  recommendation,
  entityData,
  onSelect,
  onAIPersonalize,
}: TemplateCardProps) {
  const { template, score, reasons } = recommendation;
  const TypeIcon = typeConfig[template.type]?.icon || FileText;
  const validation = validateTemplate(template.content, entityData);
  const isReady = validation.unresolvedVariables.length === 0;
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 transition-all cursor-pointer group",
        score >= 50 && "border-primary/30 bg-primary/5"
      )}
      onClick={() => onSelect(template)}
    >
      <div className={cn(
        'p-2 rounded-lg bg-muted shrink-0',
        typeConfig[template.type]?.color
      )}>
        <TypeIcon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{template.name}</h4>
          {template.is_favorite && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {typeConfig[template.type]?.label}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {goalLabels[template.goal]}
          </Badge>
          
          {score >= 40 && (
            <Badge variant="outline" className="text-[10px] gap-0.5 text-primary border-primary/30">
              <TrendingUp className="h-2 w-2" />
              {score}%
            </Badge>
          )}
          
          {isReady ? (
            <Badge variant="outline" className="text-[10px] gap-0.5 text-green-600 border-green-300">
              <CheckCircle2 className="h-2 w-2" />
              Pronto
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-600 border-amber-300">
              <AlertTriangle className="h-2 w-2" />
              {validation.unresolvedVariables.length}
            </Badge>
          )}
        </div>
        
        {reasons.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {reasons.slice(0, 2).join(' • ')}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(template);
          }}
          title="Usar template"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-purple-500 hover:text-purple-600 hover:bg-purple-50"
          onClick={(e) => {
            e.stopPropagation();
            onAIPersonalize(template);
          }}
          title="Personalizar com IA"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
