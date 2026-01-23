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
import {
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Users,
  Settings,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { useSJCopilot } from "@/hooks/useSJCopilot";
import { cn } from "@/lib/utils";

interface SJCopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  cohortId?: string;
}

export function SJCopilotDrawer({
  open,
  onOpenChange,
  studentId,
  cohortId,
}: SJCopilotDrawerProps) {
  const [activeTab, setActiveTab] = useState("diagnostico");
  const [userMessage, setUserMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    diagnose,
    validateStudent,
    analyzeChurn,
    askQuestion,
    clearMessages,
  } = useSJCopilot({ studentId, cohortId });

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

  const quickActions = [
    {
      id: "validate",
      label: "Validar Inscrição",
      icon: ClipboardCheck,
      action: validateStudent,
      disabled: !studentId,
    },
    {
      id: "churn",
      label: "Analisar Churn Risk",
      icon: TrendingDown,
      action: analyzeChurn,
      disabled: !studentId,
    },
    {
      id: "diagnose",
      label: "Diagnóstico Geral",
      icon: RefreshCw,
      action: diagnose,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:max-w-[450px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            SJ Copilot
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <TabsList className="mx-4 mt-2 grid grid-cols-3">
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="acoes">Ações Rápidas</TabsTrigger>
            <TabsTrigger value="perguntar">Perguntar</TabsTrigger>
          </TabsList>

          {/* Diagnóstico Tab */}
          <TabsContent value="diagnostico" className="flex-1 flex flex-col m-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Diagnóstico Inteligente</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analiso os dados de alunos, turmas e progressões para
                    identificar oportunidades e riscos.
                  </p>
                  <Button
                    onClick={diagnose}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Executar Diagnóstico
                  </Button>
                </div>

                {messages.length > 0 && (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg",
                          msg.role === "assistant"
                            ? "bg-muted"
                            : "bg-primary/10 ml-4"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Ações Rápidas Tab */}
          <TabsContent value="acoes" className="flex-1 m-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Execute ações rápidas de análise e validação.
                </p>

                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-14"
                    onClick={action.action}
                    disabled={action.disabled || isLoading}
                  >
                    <action.icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{action.label}</div>
                      {action.disabled && (
                        <div className="text-xs text-muted-foreground">
                          Selecione um aluno
                        </div>
                      )}
                    </div>
                  </Button>
                ))}

                <div className="pt-4 border-t border-border mt-4">
                  <h4 className="font-medium mb-3 text-sm">
                    Resultados Recentes
                  </h4>
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma análise executada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {messages
                        .filter((m) => m.role === "assistant")
                        .slice(-3)
                        .map((msg, idx) => (
                          <div key={idx} className="p-3 bg-muted rounded-lg">
                            <p className="text-sm line-clamp-3">
                              {msg.content}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Perguntar Tab */}
          <TabsContent value="perguntar" className="flex-1 flex flex-col m-0">
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
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
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
