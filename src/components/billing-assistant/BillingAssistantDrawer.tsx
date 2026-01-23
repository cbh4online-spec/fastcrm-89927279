import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  Stethoscope,
  Zap,
  MessageSquare,
  Send,
  Loader2,
  FileCheck,
  CreditCard,
  Settings,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { useBillingAssistant } from "@/hooks/useBillingAssistant";
import { cn } from "@/lib/utils";

interface BillingAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId?: string;
  subscriptionId?: string;
}

export function BillingAssistantDrawer({
  open,
  onOpenChange,
  opportunityId,
  subscriptionId
}: BillingAssistantDrawerProps) {
  const [activeTab, setActiveTab] = useState("diagnostico");
  const [chatInput, setChatInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    isLoading,
    messages,
    context,
    diagnose,
    validate,
    recommend,
    chat,
    createAutomation,
    clearHistory
  } = useBillingAssistant();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear history when drawer opens with new context
  useEffect(() => {
    if (open) {
      clearHistory();
    }
  }, [open, opportunityId, subscriptionId]);

  const handleDiagnose = () => {
    diagnose(opportunityId, subscriptionId);
  };

  const handleValidate = () => {
    validate(opportunityId, subscriptionId);
  };

  const handleRecommend = () => {
    recommend(opportunityId, subscriptionId);
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    chat(chatInput, opportunityId, subscriptionId);
    setChatInput("");
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "validate":
        validate(opportunityId, subscriptionId);
        setActiveTab("diagnostico");
        break;
      case "create_subscription":
        chat("Como posso criar uma subscrição para esta oportunidade?", opportunityId, subscriptionId);
        setActiveTab("perguntar");
        break;
      case "configure_automations":
        createAutomation("Sugere as automações mais importantes para gerir esta subscrição/oportunidade", opportunityId);
        setActiveTab("diagnostico");
        break;
      case "churn_risk":
        chat("Analisa o risco de churn desta subscrição e dá-me recomendações específicas", opportunityId, subscriptionId);
        setActiveTab("perguntar");
        break;
    }
  };

  const renderMessage = (message: { role: string; content: string; timestamp: Date }, index: number) => {
    const isAssistant = message.role === "assistant";
    
    return (
      <div
        key={index}
        className={cn(
          "flex gap-3 p-3 rounded-lg",
          isAssistant ? "bg-muted" : "bg-primary/5"
        )}
      >
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isAssistant ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}>
          {isAssistant ? <Bot className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-xs text-muted-foreground">
            {isAssistant ? "Assistente" : "Você"} • {message.timestamp.toLocaleTimeString("pt-PT")}
          </div>
          <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
            {message.content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Assistente Billing & Recorrência
          </SheetTitle>
          <SheetDescription>
            Ajuda contextual para oportunidades e subscrições
          </SheetDescription>
        </SheetHeader>

        {/* Context indicators */}
        {context && (
          <div className="flex flex-wrap gap-2 py-2">
            {context.hasOpportunity && (
              <Badge variant="outline" className="text-xs">
                <FileCheck className="h-3 w-3 mr-1" /> Oportunidade
              </Badge>
            )}
            {context.hasSubscription && (
              <Badge variant="outline" className="text-xs">
                <CreditCard className="h-3 w-3 mr-1" /> Subscrição
              </Badge>
            )}
            {context.eventCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {context.eventCount} eventos
              </Badge>
            )}
            {context.metrics && (
              <Badge variant="outline" className="text-xs">
                MRR: €{context.metrics.mrr.toFixed(0)}
              </Badge>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diagnostico" className="text-xs">
              <Stethoscope className="h-3 w-3 mr-1" />
              Diagnóstico
            </TabsTrigger>
            <TabsTrigger value="acoes" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Ações
            </TabsTrigger>
            <TabsTrigger value="perguntar" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Perguntar
            </TabsTrigger>
          </TabsList>

          {/* Diagnóstico Tab */}
          <TabsContent value="diagnostico" className="flex-1 flex flex-col mt-4">
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={handleDiagnose}
                  disabled={isLoading}
                >
                  <Stethoscope className="h-4 w-4" />
                  <span className="text-xs">Diagnóstico Completo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={handleValidate}
                  disabled={isLoading}
                >
                  <FileCheck className="h-4 w-4" />
                  <span className="text-xs">Validar Contrato</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={handleRecommend}
                  disabled={isLoading}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">Recomendações</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={() => handleQuickAction("churn_risk")}
                  disabled={isLoading}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Analisar Churn</span>
                </Button>
              </div>
            </div>

            {/* Metrics cards */}
            {context?.metrics && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">MRR</p>
                        <p className="font-semibold">€{context.metrics.mrr.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingDown className={cn(
                        "h-4 w-4",
                        context.metrics.churnRisk > 20 ? "text-red-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="text-xs text-muted-foreground">Risco Churn</p>
                        <p className="font-semibold">{context.metrics.churnRisk}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Messages area */}
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="space-y-3 pr-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Clique num botão para iniciar</p>
                    <p className="text-xs">Vou analisar os dados disponíveis</p>
                  </div>
                ) : (
                  messages.map(renderMessage)
                )}
                {isLoading && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">A analisar...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Ações Rápidas Tab */}
          <TabsContent value="acoes" className="flex-1 mt-4">
            <div className="space-y-3">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Validar Contrato
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Verificar se todos os campos obrigatórios estão preenchidos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleQuickAction("validate")}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Validar
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Criar Subscrição
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ajuda passo-a-passo para criar subscrição
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleQuickAction("create_subscription")}
                    disabled={isLoading}
                  >
                    Iniciar
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configurar Automações
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sugestões de automações para esta situação
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleQuickAction("configure_automations")}
                    disabled={isLoading}
                  >
                    Configurar
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Analisar Risco de Churn
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Identificar sinais de cancelamento e ações preventivas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleQuickAction("churn_risk")}
                    disabled={isLoading}
                  >
                    Analisar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Perguntar Tab */}
          <TabsContent value="perguntar" className="flex-1 flex flex-col mt-4">
            <ScrollArea className="flex-1 mb-4" ref={scrollRef}>
              <div className="space-y-3 pr-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Faça uma pergunta</p>
                    <p className="text-xs">Sobre billing, subscrições ou recorrência</p>
                  </div>
                ) : (
                  messages.map(renderMessage)
                )}
                {isLoading && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">A pensar...</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleChat} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escreva a sua pergunta..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !chatInput.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Clear button */}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={clearHistory}
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Limpar conversa
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
