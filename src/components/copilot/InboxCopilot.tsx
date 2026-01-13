import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  MessageSquare,
  User,
  Target,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
} from "lucide-react";
import {
  useCopilot,
  IntentClassification,
  ExtractedContact,
  ReplySuggestion,
  ConversationSummary,
} from "@/hooks/useCopilot";
import { Message } from "@/hooks/useMessages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  messages: Message[];
  onInsertReply?: (text: string) => void;
}

export function InboxCopilot({ messages, onInsertReply }: Props) {
  const { isLoading, classifyIntent, extractContact, suggestReplies, summarizeConversation } = useCopilot();
  
  const [expanded, setExpanded] = useState(true);
  const [intent, setIntent] = useState<IntentClassification | null>(null);
  const [contact, setContact] = useState<ExtractedContact | null>(null);
  const [replies, setReplies] = useState<ReplySuggestion[] | null>(null);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const copilotMessages = messages.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.content,
    direction: m.direction,
  }));

  const handleClassifyIntent = async () => {
    setActiveAction("intent");
    const result = await classifyIntent(copilotMessages);
    if (result) setIntent(result);
    setActiveAction(null);
  };

  const handleExtractContact = async () => {
    setActiveAction("contact");
    const result = await extractContact(copilotMessages);
    if (result) setContact(result);
    setActiveAction(null);
  };

  const handleSuggestReplies = async () => {
    setActiveAction("replies");
    const result = await suggestReplies(copilotMessages);
    if (result?.suggestions) setReplies(result.suggestions);
    setActiveAction(null);
  };

  const handleSummarize = async () => {
    setActiveAction("summary");
    const result = await summarizeConversation(copilotMessages);
    if (result) setSummary(result);
    setActiveAction(null);
  };

  const handleCopyReply = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Resposta copiada");
  };

  const handleInsertReply = (text: string) => {
    if (onInsertReply) {
      onInsertReply(text);
      toast.success("Resposta inserida");
    }
  };

  const intentColors = {
    sales: "bg-green-500",
    support: "bg-blue-500",
    question: "bg-yellow-500",
  };

  const sentimentColors = {
    positive: "text-green-600",
    neutral: "text-gray-600",
    negative: "text-red-600",
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">AI Copilot</CardTitle>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClassifyIntent}
              disabled={isLoading}
              className="justify-start"
            >
              {activeAction === "intent" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              Classificar Intenção
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractContact}
              disabled={isLoading}
              className="justify-start"
            >
              {activeAction === "contact" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <User className="h-4 w-4 mr-2" />
              )}
              Extrair Contacto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggestReplies}
              disabled={isLoading}
              className="justify-start"
            >
              {activeAction === "replies" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Sugerir Respostas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
              disabled={isLoading}
              className="justify-start"
            >
              {activeAction === "summary" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Resumir
            </Button>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-4">
              {/* Intent Classification */}
              {intent && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Intenção Classificada
                  </h4>
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={intentColors[intent.intent]}>
                        {intent.intent === "sales" ? "Vendas" : 
                         intent.intent === "support" ? "Suporte" : "Pergunta"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(intent.confidence * 100)}% confiança
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{intent.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Extracted Contact */}
              {contact && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contacto Extraído
                  </h4>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    {contact.name && <p className="text-sm"><strong>Nome:</strong> {contact.name}</p>}
                    {contact.email && <p className="text-sm"><strong>Email:</strong> {contact.email}</p>}
                    {contact.phone && <p className="text-sm"><strong>Telefone:</strong> {contact.phone}</p>}
                    {contact.company && <p className="text-sm"><strong>Empresa:</strong> {contact.company}</p>}
                    {contact.title && <p className="text-sm"><strong>Cargo:</strong> {contact.title}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {Math.round(contact.confidence * 100)}% confiança
                    </p>
                  </div>
                </div>
              )}

              {/* Reply Suggestions */}
              {replies && replies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Sugestões de Resposta
                  </h4>
                  <div className="space-y-2">
                    {replies.map((reply, i) => (
                      <div key={i} className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{reply.tone}</Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyReply(reply.text)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {onInsertReply && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleInsertReply(reply.text)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm">{reply.text}</p>
                        <p className="text-xs text-muted-foreground">{reply.intent}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation Summary */}
              {summary && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resumo da Conversa
                  </h4>
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">{summary.mainTopic}</p>
                    <p className="text-sm text-muted-foreground">{summary.summary}</p>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium mb-1">Pontos-chave:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {summary.keyPoints.map((point, i) => (
                          <li key={i}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Sentimento:</span>
                      <span className={cn("text-xs font-medium", sentimentColors[summary.sentiment])}>
                        {summary.sentiment === "positive" ? "Positivo" :
                         summary.sentiment === "negative" ? "Negativo" : "Neutro"}
                      </span>
                    </div>
                    {summary.pendingActions && summary.pendingActions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Ações pendentes:</p>
                        <ul className="text-xs text-muted-foreground">
                          {summary.pendingActions.map((action, i) => (
                            <li key={i}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
