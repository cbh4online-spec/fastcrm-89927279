import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Template } from '@/hooks/useTemplates';
import {
  Sparkles,
  Lightbulb,
  MessageSquare,
  Type,
  ArrowRight,
  ChevronDown,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Improvement {
  type: 'clarity' | 'cta' | 'tone' | 'length' | 'structure';
  original?: string;
  improved: string;
  reason: string;
}

interface SubjectSuggestion {
  subject: string;
  style: 'curiosity' | 'urgency' | 'value' | 'personal' | 'question';
  characterCount: number;
}

interface CTASuggestion {
  cta: string;
  urgency: 'low' | 'medium' | 'high';
  style: 'button' | 'link' | 'inline';
}

interface TemplateImproveSuggestionsProps {
  template: Template;
  onApplyImprovement?: (content: string, subject?: string) => void;
  trigger?: React.ReactNode;
}

const typeLabels: Record<string, string> = {
  clarity: 'Clareza',
  cta: 'Call-to-action',
  tone: 'Tom',
  length: 'Tamanho',
  structure: 'Estrutura',
};

const styleLabels: Record<string, string> = {
  curiosity: 'Curiosidade',
  urgency: 'Urgência',
  value: 'Valor',
  personal: 'Pessoal',
  question: 'Pergunta',
};

export function TemplateImproveSuggestions({
  template,
  onApplyImprovement,
  trigger,
}: TemplateImproveSuggestionsProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [improvements, setImprovements] = useState<{
    improvedContent?: string;
    improvedSubject?: string;
    changes?: Improvement[];
    alternativeVersion?: string;
  } | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<{
    suggestions: SubjectSuggestion[];
    bestPick: number;
    reasoning: string;
  } | null>(null);
  const [ctaSuggestions, setCtaSuggestions] = useState<{
    suggestions: CTASuggestion[];
    bestPick: number;
    context: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAlternative, setShowAlternative] = useState(false);

  const loadImprovements = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-template-copilot', {
        body: {
          action: 'improve_template',
          template: {
            content: template.content,
            subject: template.subject,
            type: template.type,
            goal: template.goal,
            tone: template.tone,
          },
        },
      });

      if (fnError) throw fnError;

      if (data?.result) {
        setImprovements(data.result);
      }
    } catch (err: any) {
      console.error('Improve template error:', err);
      setError(err.message || 'Erro ao obter sugestões');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubjectSuggestions = async () => {
    if (template.type !== 'email') return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-template-copilot', {
        body: {
          action: 'suggest_subject_lines',
          template: {
            content: template.content,
            subject: template.subject,
            type: template.type,
            goal: template.goal,
          },
        },
      });

      if (fnError) throw fnError;

      if (data?.result) {
        setSubjectSuggestions(data.result);
      }
    } catch (err) {
      console.error('Subject suggestions error:', err);
    }
  };

  const loadCtaSuggestions = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-template-copilot', {
        body: {
          action: 'suggest_ctas',
          template: {
            content: template.content,
            type: template.type,
            goal: template.goal,
          },
        },
      });

      if (fnError) throw fnError;

      if (data?.result) {
        setCtaSuggestions(data.result);
      }
    } catch (err) {
      console.error('CTA suggestions error:', err);
    }
  };

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !improvements && !isLoading) {
      await Promise.all([
        loadImprovements(),
        loadSubjectSuggestions(),
        loadCtaSuggestions(),
      ]);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApply = () => {
    if (improvements?.improvedContent && onApplyImprovement) {
      onApplyImprovement(improvements.improvedContent, improvements.improvedSubject);
      setOpen(false);
      toast.success('Melhorias aplicadas');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Melhorar
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Sugestões IA</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Melhorias e alternativas para o template
          </p>
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Improvements */}
              {improvements?.changes && improvements.changes.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Melhorias Sugeridas
                  </h5>
                  {improvements.changes.map((change, i) => (
                    <div key={i} className="p-2 rounded-md bg-muted/50 space-y-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabels[change.type] || change.type}
                      </Badge>
                      {change.original && (
                        <div className="text-xs text-muted-foreground line-through">
                          {change.original}
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                        <span className="text-xs">{change.improved}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{change.reason}</p>
                    </div>
                  ))}
                  
                  {onApplyImprovement && (
                    <Button size="sm" onClick={handleApply} className="w-full">
                      Aplicar Melhorias
                    </Button>
                  )}
                </div>
              )}

              {/* Alternative Version */}
              {improvements?.alternativeVersion && (
                <Collapsible open={showAlternative} onOpenChange={setShowAlternative}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                      <span className="text-xs">Versão alternativa</span>
                      <ChevronDown className={cn(
                        "h-3 w-3 transition-transform",
                        showAlternative && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="p-3 rounded-md bg-muted/30 text-xs whitespace-pre-wrap relative group">
                      {improvements.alternativeVersion}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopy(improvements.alternativeVersion!, 'alt')}
                      >
                        {copied === 'alt' ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Subject Line Suggestions */}
              {subjectSuggestions && subjectSuggestions.suggestions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Assuntos Alternativos
                    </h5>
                    {subjectSuggestions.suggestions.map((s, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-2 rounded-md text-xs flex items-center justify-between gap-2 group",
                          i === subjectSuggestions.bestPick
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/30"
                        )}
                      >
                        <div className="flex-1">
                          <span>{s.subject}</span>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[9px]">
                              {styleLabels[s.style] || s.style}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground">
                              {s.characterCount} caracteres
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleCopy(s.subject, `subject-${i}`)}
                        >
                          {copied === `subject-${i}` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* CTA Suggestions */}
              {ctaSuggestions && ctaSuggestions.suggestions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Type className="h-3 w-3" />
                      CTAs Alternativos
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {ctaSuggestions.suggestions.map((c, i) => (
                        <Badge
                          key={i}
                          variant={i === ctaSuggestions.bestPick ? "default" : "outline"}
                          className="cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => handleCopy(c.cta, `cta-${i}`)}
                        >
                          {c.cta}
                          {copied === `cta-${i}` && <Check className="h-2.5 w-2.5 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
