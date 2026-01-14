import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Template, TemplateType } from '@/hooks/useTemplates';
import { renderTemplate, VariableContext } from '@/lib/templateVariables';
import {
  Sparkles,
  Send,
  Copy,
  RefreshCw,
  Mail,
  MessageCircle,
  Instagram,
  FileText,
  Smartphone,
  User,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIPersonalizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
  context: VariableContext;
  onApply: (personalizedContent: string) => void;
}

const typeConfig: Record<TemplateType, { icon: React.ElementType; color: string; label: string }> = {
  email: { icon: Mail, color: 'text-blue-500', label: 'Email' },
  whatsapp: { icon: MessageCircle, color: 'text-green-500', label: 'WhatsApp' },
  instagram_dm: { icon: Instagram, color: 'text-pink-500', label: 'Instagram' },
  proposal: { icon: FileText, color: 'text-purple-500', label: 'Proposta' },
  sms: { icon: Smartphone, color: 'text-amber-500', label: 'SMS' },
};

export function AIPersonalizeDialog({
  open,
  onOpenChange,
  template,
  context,
  onApply,
}: AIPersonalizeDialogProps) {
  const [personalizedContent, setPersonalizedContent] = useState('');
  const [personalizedSubject, setPersonalizedSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adaptations, setAdaptations] = useState<string[]>([]);
  const [unresolvedVars, setUnresolvedVars] = useState<string[]>([]);
  
  const TypeIcon = typeConfig[template.type]?.icon || FileText;
  
  // Get the base rendered content
  const baseContent = renderTemplate(template.content, context);
  const baseSubject = template.subject ? renderTemplate(template.subject, context) : '';
  
  // Generate personalized content on open
  useEffect(() => {
    if (open && !personalizedContent) {
      generatePersonalizedContent();
    }
  }, [open]);
  
  const generatePersonalizedContent = async () => {
    setIsGenerating(true);
    setError(null);
    setAdaptations([]);
    setUnresolvedVars([]);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-template-copilot', {
        body: {
          action: 'personalize_template',
          template: {
            content: template.content,
            subject: template.subject,
            type: template.type,
            goal: template.goal,
            tone: template.tone,
          },
          context: {
            lead: context.lead,
            opportunity: context.opportunity,
            company: context.company,
            contact: context.contact,
            user: context.user,
          },
          instructions: instructions || undefined,
        },
      });
      
      if (fnError) throw fnError;
      
      if (data?.result) {
        setPersonalizedContent(data.result.personalizedContent);
        setPersonalizedSubject(data.result.personalizedSubject || '');
        setAdaptations(data.result.adaptations || []);
        setUnresolvedVars(data.result.unresolvedVariables || []);
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (err: any) {
      console.error('AI personalization error:', err);
      const errorMessage = err.message || 'Não foi possível personalizar';
      setError(errorMessage);
      // Fallback to base content
      setPersonalizedContent(baseContent);
      setPersonalizedSubject(baseSubject);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleRegenerate = () => {
    setPersonalizedContent('');
    generatePersonalizedContent();
  };
  
  const handleCopy = () => {
    const text = personalizedSubject 
      ? `Assunto: ${personalizedSubject}\n\n${personalizedContent}`
      : personalizedContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleApply = () => {
    onApply(personalizedContent);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Personalizar com IA
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <TypeIcon className={cn("h-3 w-3", typeConfig[template.type]?.color)} />
              {template.name}
            </Badge>
            <span>→</span>
            <span>Versão personalizada para este contexto</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Context Summary */}
          <div className="flex flex-wrap gap-2">
            {context.lead && (
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {context.lead.name}
              </Badge>
            )}
            {context.opportunity && (
              <Badge variant="secondary" className="gap-1">
                <FileText className="h-3 w-3" />
                {context.opportunity.title}
              </Badge>
            )}
            {template.tone && (
              <Badge variant="outline" className="text-xs">
                Tom: {template.tone}
              </Badge>
            )}
          </div>
          
          {/* Instructions Input */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Instruções adicionais (opcional)
            </Label>
            <Textarea
              placeholder="Ex: Mencionar a reunião de ontem, usar tom mais casual..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="h-16 text-sm resize-none"
            />
          </div>
          
          <Separator />
          
          {/* Personalized Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Mensagem Personalizada</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                  Regenerar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isGenerating || !personalizedContent}
                  className="h-7 text-xs gap-1"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[200px] rounded-md border bg-muted/30">
              {isGenerating ? (
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    A personalizar mensagem...
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : error ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{personalizedContent}</div>
                </div>
              ) : (
                <Textarea
                  value={personalizedContent}
                  onChange={(e) => setPersonalizedContent(e.target.value)}
                  className="h-full min-h-[180px] border-0 bg-transparent resize-none"
                  placeholder="Conteúdo personalizado aparecerá aqui..."
                />
              )}
            </ScrollArea>
          </div>
          
          {/* Adaptations Made */}
          {adaptations.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Adaptações feitas</Label>
              <div className="flex flex-wrap gap-1">
                {adaptations.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Unresolved Variables Warning */}
          {unresolvedVars.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800">Variáveis não resolvidas</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {unresolvedVars.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Comparison with original */}
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
              Ver template original
            </summary>
            <div className="mt-2 p-3 rounded-md bg-muted/50 whitespace-pre-wrap text-muted-foreground">
              {baseContent}
            </div>
          </details>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={isGenerating || !personalizedContent}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Usar Mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Build a description of the context for the AI
function buildContextDescription(context: VariableContext): string {
  const parts: string[] = [];
  
  if (context.lead) {
    parts.push(`Lead: ${context.lead.name}`);
    if (context.lead.email) parts.push(`Email: ${context.lead.email}`);
    if (context.lead.status) parts.push(`Status: ${context.lead.status}`);
    if (context.lead.source) parts.push(`Origem: ${context.lead.source}`);
  }
  
  if (context.opportunity) {
    parts.push(`Oportunidade: ${context.opportunity.title}`);
    if (context.opportunity.value) parts.push(`Valor: €${context.opportunity.value}`);
    if (context.opportunity.stage) parts.push(`Etapa: ${context.opportunity.stage}`);
  }
  
  if (context.company) {
    parts.push(`Empresa: ${context.company.name}`);
    if (context.company.industry) parts.push(`Indústria: ${context.company.industry}`);
  }
  
  if (context.contact) {
    parts.push(`Contato: ${context.contact.name}`);
    if (context.contact.job_title) parts.push(`Cargo: ${context.contact.job_title}`);
  }
  
  if (context.user) {
    parts.push(`Remetente: ${context.user.full_name || context.user.email || 'Usuário'}`);
  }
  
  return parts.join('\n');
}
