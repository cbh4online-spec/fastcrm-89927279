import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  Loader2, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle2,
  Zap,
  Filter,
  PlayCircle,
  ArrowRight,
  Clock,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AutomationRule } from "@/hooks/useAutomations";
import { generatePlainLanguageSummary } from "@/lib/automationPlainLanguage";

interface AIAutomationExplainerProps {
  rule: AutomationRule;
}

interface AIExplanation {
  summary: string;
  triggerExplanation: string;
  conditionsExplanation: string;
  actionsExplanation: string;
  potentialIssues: string[];
  suggestions: string[];
  estimatedFrequency: string;
}

export function AIAutomationExplainer({ rule }: AIAutomationExplainerProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const plainLanguage = generatePlainLanguageSummary(
        rule.trigger,
        rule.conditions?.map(c => ({
          field_name: c.field_name,
          operator: c.operator,
          value: c.value,
        })) || [],
        rule.actions?.map(a => ({
          action_type: a.action_type,
          config: a.config as Record<string, unknown>,
        })) || []
      );

      const { data, error: fnError } = await supabase.functions.invoke("ai-automation-explainer", {
        body: {
          rule: {
            name: rule.name,
            description: rule.description,
            trigger: rule.trigger,
            trigger_config: rule.trigger_config,
            conditions: rule.conditions,
            actions: rule.actions,
            is_active: rule.is_active,
          },
          plainLanguageSummary: plainLanguage.fullSummary,
        },
      });

      if (fnError) throw fnError;

      setExplanation(data.explanation);
    } catch (err) {
      console.error("Error getting AI explanation:", err);
      setError("Erro ao obter explicação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            setOpen(true);
            if (!explanation) handleExplain();
          }}
        >
          <Bot className="h-4 w-4 mr-1" />
          Explicar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Explicação da Automação
          </DialogTitle>
          <DialogDescription>
            A IA analisa e explica o funcionamento desta regra em linguagem simples
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>A analisar automação...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={handleExplain} className="mt-4">
                Tentar novamente
              </Button>
            </div>
          ) : explanation ? (
            <div className="space-y-6">
              {/* Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{explanation.summary}</p>
                </CardContent>
              </Card>

              {/* Trigger */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-amber-500/10">
                    <Zap className="h-4 w-4 text-amber-600" />
                  </div>
                  <h4 className="font-medium">Quando é acionada?</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {explanation.triggerExplanation}
                </p>
              </div>

              {/* Conditions */}
              {rule.conditions && rule.conditions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-blue-500/10">
                      <Filter className="h-4 w-4 text-blue-600" />
                    </div>
                    <h4 className="font-medium">Quais são as condições?</h4>
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">
                    {explanation.conditionsExplanation}
                  </p>
                </div>
              )}

              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-green-500/10">
                    <PlayCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <h4 className="font-medium">O que acontece?</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {explanation.actionsExplanation}
                </p>
              </div>

              <Separator />

              {/* Estimated Frequency */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Frequência estimada</p>
                  <p className="text-xs text-muted-foreground">
                    {explanation.estimatedFrequency}
                  </p>
                </div>
              </div>

              {/* Potential Issues */}
              {explanation.potentialIssues.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <h4 className="font-medium text-sm">Pontos de atenção</h4>
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {explanation.potentialIssues.map((issue, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {explanation.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <h4 className="font-medium text-sm">Sugestões de melhoria</h4>
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {explanation.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safety Notice */}
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400">
                    A IA apenas explica
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Todas as alterações a esta automação requerem confirmação manual. 
                    A IA não pode ativar, modificar ou enviar mensagens automaticamente.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
