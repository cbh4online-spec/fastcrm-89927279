import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Zap,
  Loader2,
  Sparkles,
  ArrowRight,
  Filter,
  PlayCircle,
  Check,
  AlertTriangle,
  MessageSquare,
  Bot,
} from "lucide-react";
import { useGenerateAutomation, automationExamples } from "@/hooks/useGenerateAutomation";
import { useCreateAutomationRule, AutomationTrigger, AutomationActionType, ConditionOperator } from "@/hooks/useAutomations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ConversationContext {
  messages: Array<{
    direction: string;
    content: string;
    sent_at: string;
  }>;
  leadName?: string;
  leadEmail?: string;
  channel?: string;
  aiIntent?: string;
  aiSentiment?: string;
}

interface Props {
  conversation?: ConversationContext;
  onCreated?: () => void;
}

export function ConversationAutomationHelper({ conversation, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [userRequest, setUserRequest] = useState("");
  const [generatedAutomation, setGeneratedAutomation] = useState<{
    name: string;
    description: string;
    trigger: string;
    trigger_config?: Record<string, unknown>;
    conditions: Array<{ field_name: string; operator: string; value: string | null }>;
    actions: Array<{ action_type: string; config: Record<string, unknown> }>;
    explanation: string;
    natural_language_summary: string;
  } | null>(null);

  const generateAutomation = useGenerateAutomation();
  const createRule = useCreateAutomationRule();

  const handleGenerate = async (request?: string) => {
    const requestText = request || userRequest;
    if (!requestText && !conversation) {
      toast.error("Descreva a automação que pretende criar");
      return;
    }

    try {
      const automation = await generateAutomation.mutateAsync({
        conversation,
        userRequest: requestText,
      });
      setGeneratedAutomation(automation);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCreate = async () => {
    if (!generatedAutomation) return;

    try {
      await createRule.mutateAsync({
        name: generatedAutomation.name,
        description: generatedAutomation.description,
        trigger: generatedAutomation.trigger as AutomationTrigger,
        is_active: false, // Always create as draft
        conditions: generatedAutomation.conditions.map((c, i) => ({
          field_name: c.field_name,
          operator: c.operator as ConditionOperator,
          value: c.value,
          position: i,
        })),
        actions: generatedAutomation.actions.map((a, i) => ({
          action_type: a.action_type as AutomationActionType,
          config: a.config,
          position: i,
        })),
      });
      
      toast.success("Automação criada! Reveja e ative na página de Automações.");
      setOpen(false);
      setGeneratedAutomation(null);
      setUserRequest("");
      onCreated?.();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleReset = () => {
    setGeneratedAutomation(null);
    setUserRequest("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Criar Automação com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Criar Automação com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o que pretende automatizar em linguagem natural
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {!generatedAutomation ? (
            <div className="space-y-6">
              {/* Input */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Se contacto não responder em 2 dias → enviar follow-up"
                    value={userRequest}
                    onChange={(e) => setUserRequest(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    disabled={generateAutomation.isPending}
                  />
                  <Button 
                    onClick={() => handleGenerate()}
                    disabled={generateAutomation.isPending || (!userRequest && !conversation)}
                  >
                    {generateAutomation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {conversation && (
                  <p className="text-sm text-muted-foreground">
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    Contexto da conversa com {conversation.leadName || "lead"} será usado
                  </p>
                )}
              </div>

              {/* Examples */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Exemplos populares</h4>
                <div className="grid gap-2">
                  {automationExamples.map((example, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start h-auto py-2 px-3 text-left"
                      onClick={() => {
                        setUserRequest(example.request);
                        handleGenerate(example.request);
                      }}
                      disabled={generateAutomation.isPending}
                    >
                      <span className="text-sm">{example.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generated automation preview */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    {generatedAutomation.name}
                  </CardTitle>
                  <CardDescription>{generatedAutomation.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Natural language summary */}
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-sm font-medium">
                      "{generatedAutomation.natural_language_summary}"
                    </p>
                  </div>

                  {/* Visual flow */}
                  <div className="space-y-3">
                    {/* Trigger */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-amber-500/10">
                        <Zap className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Gatilho</p>
                        <Badge variant="secondary">{generatedAutomation.trigger}</Badge>
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />

                    {/* Conditions */}
                    {generatedAutomation.conditions.length > 0 && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-blue-500/10">
                            <Filter className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Condições</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {generatedAutomation.conditions.map((c, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {c.field_name} {c.operator} {c.value || ""}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                      </>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-green-500/10">
                        <PlayCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ações</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {generatedAutomation.actions.map((a, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {a.action_type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* AI Explanation */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Explicação da IA
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {generatedAutomation.explanation}
                    </p>
                  </div>

                  {/* Safety notice */}
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        Será criada como rascunho
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Reveja e ative manualmente na página de Automações. 
                        A IA nunca ativa automações automaticamente.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          {generatedAutomation ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                Começar de novo
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={createRule.isPending}
              >
                {createRule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Criar Automação
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}