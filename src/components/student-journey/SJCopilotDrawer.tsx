import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  TrendingDown,
  RefreshCw,
  MessageSquare,
  Mail,
  Zap,
  Copy,
  Tags,
  Bot,
} from "lucide-react";
import { useSJCopilot, MessageContext, SuggestedMessage, GeneratedAutomation } from "@/hooks/useSJCopilot";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SJCopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  cohortId?: string;
  enrollmentId?: string;
  onAutomationGenerated?: (automation: GeneratedAutomation) => void;
}

export function SJCopilotDrawer({
  open,
  onOpenChange,
  studentId,
  cohortId,
  enrollmentId,
  onAutomationGenerated,
}: SJCopilotDrawerProps) {
  const [activeTab, setActiveTab] = useState("diagnostico");
  const [userMessage, setUserMessage] = useState("");
  const [automationPrompt, setAutomationPrompt] = useState("");
  const [generatedAutomation, setGeneratedAutomation] = useState<GeneratedAutomation | null>(null);
  const [suggestedMessage, setSuggestedMessage] = useState<SuggestedMessage | null>(null);
  const [messageChannel, setMessageChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [messagePurpose, setMessagePurpose] = useState<MessageContext["purpose"]>("followup");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    diagnose,
    validateStudent,
    analyzeChurn,
    askQuestion,
    suggestMessage,
    generateAutomation,
    clearMessages,
  } = useSJCopilot({ studentId, cohortId, enrollmentId });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isLoading) return;
    const msg = userMessage;
    setUserMessage("");
    await askQuestion(msg);
  };

  const handleGenerateMessage = async () => {
    if (isLoading) return;
    const context: MessageContext = { channel: messageChannel, purpose: messagePurpose };
    const result = await suggestMessage(context);
    if (result) {
      setSuggestedMessage(result);
    }
  };

  const handleGenerateAutomation = async () => {
    if (!automationPrompt.trim() || isLoading) return;
    const result = await generateAutomation(automationPrompt);
    if (result) {
      setGeneratedAutomation(result);
    }
  };

  const handleCopyMessage = () => {
    if (suggestedMessage) {
      navigator.clipboard.writeText(suggestedMessage.message);
      toast.success("Mensagem copiada!");
    }
  };

  const handleUseAutomation = () => {
    if (generatedAutomation && onAutomationGenerated) {
      onAutomationGenerated(generatedAutomation);
      toast.success("Automação adicionada ao builder!");
      setGeneratedAutomation(null);
      setAutomationPrompt("");
    }
  };

  const quickActions = [
    {
      id: "validate",
      label: "Validar Inscrição",
      icon: ClipboardCheck,
      action: validateStudent,
      disabled: !studentId,
      description: "Verifica se o perfil está pronto",
    },
    {
      id: "churn",
      label: "Analisar Risco",
      icon: TrendingDown,
      action: analyzeChurn,
      disabled: !studentId,
      description: "Avalia risco de desistência",
    },
    {
      id: "diagnose",
      label: "Diagnóstico Completo",
      icon: RefreshCw,
      action: diagnose,
      description: "Análise completa do perfil",
    },
  ];

  const purposeLabels = {
    followup: "Follow-up",
    welcome: "Boas-vindas",
    reminder: "Lembrete",
    congratulations: "Parabéns",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-base">SJ Copilot</div>
              <div className="text-xs text-muted-foreground font-normal">
                Assistente de Student Journey
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-2 grid grid-cols-4 h-9">
            <TabsTrigger value="diagnostico" className="text-xs">
              Diagnóstico
            </TabsTrigger>
            <TabsTrigger value="mensagens" className="text-xs">
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="automacoes" className="text-xs">
              Automações
            </TabsTrigger>
            <TabsTrigger value="perguntar" className="text-xs">
              Perguntar
            </TabsTrigger>
          </TabsList>

          {/* Diagnóstico Tab */}
          <TabsContent value="diagnostico" className="flex-1 flex flex-col m-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Quick Actions */}
                <div className="grid gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="w-full justify-start gap-3 h-14"
                      onClick={action.action}
                      disabled={action.disabled || isLoading}
                    >
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-sm">{action.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.disabled ? "Selecione um aluno" : action.description}
                        </div>
                      </div>
                      {isLoading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </Button>
                  ))}
                </div>

                {/* Results */}
                {messages.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Resultados
                    </h4>
                    {messages
                      .filter((m) => m.role === "assistant")
                      .slice(-3)
                      .map((msg, idx) => (
                        <Card key={idx}>
                          <CardContent className="p-3">
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Mensagens Tab */}
          <TabsContent value="mensagens" className="flex-1 flex flex-col m-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Canal</label>
                    <Select value={messageChannel} onValueChange={(v) => setMessageChannel(v as "whatsapp" | "email")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </span>
                        </SelectItem>
                        <SelectItem value="email">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Objetivo</label>
                    <Select value={messagePurpose} onValueChange={(v) => setMessagePurpose(v as MessageContext["purpose"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(purposeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateMessage}
                  disabled={isLoading || !studentId}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Gerar Mensagem
                </Button>

                {!studentId && (
                  <p className="text-xs text-muted-foreground text-center">
                    Selecione um aluno para gerar mensagens personalizadas
                  </p>
                )}

                {suggestedMessage && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Mensagem Sugerida</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {suggestedMessage.tone}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      {suggestedMessage.subject && messageChannel === "email" && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Assunto</label>
                          <p className="text-sm font-medium">{suggestedMessage.subject}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
                        <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg mt-1">
                          {suggestedMessage.message}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          CTA: {suggestedMessage.callToAction}
                        </span>
                        <Button size="sm" variant="outline" onClick={handleCopyMessage} className="gap-1.5">
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Automações Tab */}
          <TabsContent value="automacoes" className="flex-1 flex flex-col m-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">
                    Descreva a automação que pretende criar
                  </label>
                  <Textarea
                    placeholder="Ex: Quando um aluno ficar 7 dias sem atividade, criar uma tarefa de follow-up e enviar um email de reengajamento..."
                    value={automationPrompt}
                    onChange={(e) => setAutomationPrompt(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <Button
                  onClick={handleGenerateAutomation}
                  disabled={isLoading || !automationPrompt.trim()}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Gerar Automação
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Exemplos:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Se aluno não responder em 3 dias, criar tarefa urgente</li>
                    <li>Quando inscrição for concluída, enviar parabéns</li>
                    <li>Se risco de desistência for alto, notificar gestor</li>
                  </ul>
                </div>

                {generatedAutomation && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{generatedAutomation.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {generatedAutomation.trigger}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {generatedAutomation.description}
                      </p>

                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium">Condições</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedAutomation.conditions.map((c, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {c.field} {c.operator} {c.value}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium">Ações</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedAutomation.actions.map((a, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {a.type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground italic">
                        {generatedAutomation.explanation}
                      </p>

                      <Button
                        onClick={handleUseAutomation}
                        className="w-full gap-2"
                        disabled={!onAutomationGenerated}
                      >
                        <Zap className="h-4 w-4" />
                        Usar esta Automação
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Perguntar Tab */}
          <TabsContent value="perguntar" className="flex-1 flex flex-col m-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Pergunte ao Copilot</h3>
                    <p className="text-sm text-muted-foreground">
                      Faça perguntas sobre alunos, turmas, progresso ou peça
                      recomendações de ações.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg",
                        msg.role === "assistant"
                          ? "bg-muted"
                          : "bg-primary/10 ml-4"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Pergunte algo..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[60px] resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!userMessage.trim() || isLoading}
                  size="icon"
                  className="h-auto"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Clear button */}
        {messages.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={clearMessages}
            >
              Limpar conversa
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
