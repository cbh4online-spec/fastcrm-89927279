import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, X } from "lucide-react";
import { ChatMessage, ChatMessageData } from "./ChatMessage";
import { QuickReplies, QuickReplyOption } from "./QuickReplies";
import { ExtensionSuggestions } from "./ExtensionSuggestions";
import { ApplyingStep } from "./steps/ApplyingStep";
import { useIntelligentOnboarding, OnboardingConfig } from "@/hooks/useIntelligentOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface ConversationalOnboardingProps {
  workspaceName: string;
  onComplete: () => void;
  onSkip: () => void;
}

type ConvoStep =
  | "welcome"
  | "business_type"
  | "revenue_model"
  | "team_size"
  | "sales_complexity"
  | "success"
  | "process"
  | "channels"
  | "generating"
  | "preview_summary"
  | "applying"
  | "extensions"
  | "done";

const BUSINESS_TYPES: QuickReplyOption[] = [
  { label: "SaaS / Software", value: "saas", icon: "💻" },
  { label: "Consultoria", value: "consulting", icon: "🎯" },
  { label: "Agência / Marketing", value: "agency", icon: "📢" },
  { label: "E-commerce / Retail", value: "ecommerce", icon: "🛒" },
  { label: "Educação / Formação", value: "education", icon: "🎓" },
  { label: "Serviços Financeiros", value: "accounting", icon: "💰" },
  { label: "Serviços Profissionais", value: "services", icon: "🏢" },
  { label: "Outro", value: "other", icon: "✨" },
];

const REVENUE_MODELS: QuickReplyOption[] = [
  { label: "Subscrição", value: "subscription", icon: "🔄" },
  { label: "Venda Única", value: "one-time", icon: "💳" },
  { label: "Projetos", value: "project-based", icon: "📋" },
  { label: "Misto", value: "mixed", icon: "🔀" },
];

const TEAM_SIZES: QuickReplyOption[] = [
  { label: "Solo", value: "solo", icon: "🧑" },
  { label: "2-5 pessoas", value: "2-5", icon: "👥" },
  { label: "6-20 pessoas", value: "6-20", icon: "👨‍👩‍👧‍👦" },
  { label: "20+", value: "20+", icon: "🏢" },
];

const COMPLEXITY: QuickReplyOption[] = [
  { label: "Simples", value: "simple", description: "Decisão rápida, poucos passos" },
  { label: "Médio", value: "medium", description: "Algumas etapas, múltiplos contactos" },
  { label: "Complexo", value: "complex", description: "Longo, vários decisores" },
];

const CHANNELS: QuickReplyOption[] = [
  { label: "Formulários", value: "forms", icon: "📝" },
  { label: "Email", value: "email", icon: "📧" },
  { label: "WhatsApp", value: "whatsapp", icon: "💬" },
  { label: "Instagram", value: "instagram", icon: "📸" },
  { label: "Telefone", value: "phone", icon: "📞" },
  { label: "Referências", value: "referrals", icon: "🤝" },
];

let msgCounter = 0;
function makeMsg(role: "assistant" | "user", content: string, type: ChatMessageData["type"] = "text"): ChatMessageData {
  return { id: `msg-${++msgCounter}`, role, content, type };
}

export function ConversationalOnboarding({ workspaceName, onComplete, onSkip }: ConversationalOnboardingProps) {
  const onboarding = useIntelligentOnboarding();
  const { currentWorkspace } = useWorkspace();

  const [convoStep, setConvoStep] = useState<ConvoStep>("welcome");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Add assistant message with typing delay
  const addAssistant = useCallback((content: string, type: ChatMessageData["type"] = "text") => {
    setIsTyping(true);
    const delay = Math.min(400 + content.length * 2, 1200);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, makeMsg("assistant", content, type)]);
    }, delay);
  }, []);

  const addUser = useCallback((content: string) => {
    setMessages((prev) => [...prev, makeMsg("user", content)]);
  }, []);

  // Start conversation
  useEffect(() => {
    addAssistant(`Olá! 👋 Sou o assistente do FastCRM.\n\nVou ajudar-te a configurar o **${workspaceName}** em poucos minutos.\n\nQual é o tipo de negócio?`);
    setConvoStep("business_type");
  }, []);

  // Handle quick reply selection per step
  const handleQuickReply = (value: string) => {
    switch (convoStep) {
      case "business_type": {
        const label = BUSINESS_TYPES.find((b) => b.value === value)?.label || value;
        addUser(label);
        onboarding.updateAnswer("businessType", value);
        if (value === "other") {
          setConvoStep("welcome"); // temp: will show text input
          setTimeout(() => {
            addAssistant("Que tipo de negócio tens? Escreve em poucas palavras.");
            setConvoStep("business_type"); // stay but expect text
          }, 600);
          return;
        }
        setConvoStep("revenue_model");
        setTimeout(() => addAssistant("Qual é o teu modelo de receita principal?"), 500);
        break;
      }
      case "revenue_model": {
        const label = REVENUE_MODELS.find((r) => r.value === value)?.label || value;
        addUser(label);
        onboarding.updateAnswer("revenueModel" as any, value);
        setConvoStep("team_size");
        setTimeout(() => addAssistant("Qual é o tamanho da tua equipa comercial?"), 500);
        break;
      }
      case "team_size": {
        const label = TEAM_SIZES.find((t) => t.value === value)?.label || value;
        addUser(label);
        onboarding.updateAnswer("teamSize" as any, value);
        setConvoStep("sales_complexity");
        setTimeout(() => addAssistant("Como descreverias a complexidade do teu ciclo de vendas?"), 500);
        break;
      }
      case "sales_complexity": {
        const label = COMPLEXITY.find((c) => c.value === value)?.label || value;
        addUser(label);
        onboarding.updateAnswer("salesComplexity" as any, value);
        setConvoStep("success");
        setTimeout(() => addAssistant("O que representa uma venda bem-sucedida para ti? Descreve em poucas palavras."), 500);
        break;
      }
      case "channels": {
        // multi-select toggle
        setSelectedChannels((prev) =>
          prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
        );
        break;
      }
    }
  };

  // Handle text submit
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput("");

    switch (convoStep) {
      case "business_type": {
        // Custom business type
        addUser(text);
        onboarding.updateAnswer("businessType", "other");
        onboarding.updateAnswer("customBusinessType", text);
        setConvoStep("revenue_model");
        setTimeout(() => addAssistant("Qual é o teu modelo de receita principal?"), 500);
        break;
      }
      case "success": {
        addUser(text);
        onboarding.updateAnswer("successDefinition", text);
        setConvoStep("process");
        setTimeout(() => addAssistant("Descreve brevemente o teu processo de vendas atual. Desde o primeiro contacto até ao fecho."), 500);
        break;
      }
      case "process": {
        addUser(text);
        onboarding.updateAnswer("processDescription", text);
        setConvoStep("channels");
        setTimeout(() => addAssistant("Por onde chegam os teus contactos? Seleciona os canais e clica em confirmar."), 500);
        break;
      }
    }
  };

  // Confirm channels and generate
  const handleConfirmChannels = () => {
    const labels = selectedChannels.map((c) => CHANNELS.find((ch) => ch.value === c)?.label || c);
    addUser(labels.join(", "));
    onboarding.updateAnswer("channels", selectedChannels);
    setConvoStep("generating");

    setTimeout(async () => {
      addAssistant("A analisar o teu negócio e a criar uma configuração personalizada... 🧠");
      
      try {
        const { data, error } = await supabase.functions.invoke("ai-onboarding-setup", {
          body: {
            ...onboarding.answers,
            channels: selectedChannels,
            revenueModel: (onboarding.answers as any).revenueModel,
            teamSize: (onboarding.answers as any).teamSize,
            salesComplexity: (onboarding.answers as any).salesComplexity,
          },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || "Erro");
        }

        onboarding.updateConfig(data.config);
        
        const cfg = data.config as OnboardingConfig;
        const summary = `### ✅ Configuração criada!\n\n` +
          `**Pipeline:** ${cfg.pipeline.name} (${cfg.pipeline.stages.length} etapas)\n\n` +
          `**Campos personalizados:** ${Object.values(cfg.customFields).flat().length} campos\n\n` +
          `**Formulários:** ${cfg.forms.length}\n\n` +
          `**Automações sugeridas:** ${cfg.automations.length}\n\n` +
          `${cfg.explanations.general}`;

        setIsTyping(false);
        setMessages((prev) => [...prev, makeMsg("assistant", summary, "card")]);
        setConvoStep("preview_summary");

      } catch (err) {
        console.error(err);
        setIsTyping(false);
        setMessages((prev) => [...prev, makeMsg("assistant", "Ocorreu um erro ao gerar a configuração. Tenta novamente.")]);
        setConvoStep("process");
        toast.error("Erro ao gerar configuração");
      }
    }, 800);
  };

  // Show applying step
  if (convoStep === "applying" && onboarding.config) {
    return (
      <ApplyingStep
        config={onboarding.config}
        answers={onboarding.answers}
        onComplete={() => setConvoStep("extensions")}
      />
    );
  }

  // Show extension suggestions
  if (convoStep === "extensions") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <ExtensionSuggestions
            businessType={onboarding.answers.businessType}
            onInstall={(pack) => {
              toast.success(`${pack.name} será instalado!`);
            }}
            onSkip={onComplete}
          />
        </div>
      </div>
    );
  }

  const showQuickReplies = !isTyping && (() => {
    switch (convoStep) {
      case "business_type": return messages.length > 0 && !messages.some(m => m.role === "user");
      case "revenue_model": return true;
      case "team_size": return true;
      case "sales_complexity": return true;
      case "channels": return true;
      default: return false;
    }
  })();

  const showTextInput = !isTyping && ["success", "process"].includes(convoStep);
  const showCustomBusinessInput = !isTyping && convoStep === "business_type" && messages.some(m => m.content.includes("Que tipo de negócio"));

  const currentQuickReplies = (() => {
    switch (convoStep) {
      case "business_type": return BUSINESS_TYPES;
      case "revenue_model": return REVENUE_MODELS;
      case "team_size": return TEAM_SIZES;
      case "sales_complexity": return COMPLEXITY;
      case "channels": return CHANNELS;
      default: return [];
    }
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Configuração Inteligente</p>
            <p className="text-xs text-muted-foreground">{workspaceName}</p>
          </div>
        </div>
        <button onClick={onSkip} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {isTyping && (
          <ChatMessage
            message={{ id: "typing", role: "assistant", content: "", type: "typing" }}
          />
        )}

        {/* Quick replies */}
        {showQuickReplies && convoStep !== "channels" && (
          <QuickReplies
            options={currentQuickReplies}
            onSelect={handleQuickReply}
            columns={convoStep === "sales_complexity" ? 3 : 2}
          />
        )}

        {/* Channels multi-select */}
        {showQuickReplies && convoStep === "channels" && (
          <div className="space-y-3">
            <QuickReplies
              options={CHANNELS}
              onSelect={handleQuickReply}
              multiSelect
              selected={selectedChannels}
              columns={3}
            />
            {selectedChannels.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-11">
                <Button onClick={handleConfirmChannels} size="sm" className="gap-2">
                  Confirmar ({selectedChannels.length})
                  <Send className="w-3 h-3" />
                </Button>
              </motion.div>
            )}
          </div>
        )}

        {/* Preview summary actions */}
        {convoStep === "preview_summary" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 pl-11">
            <Button onClick={() => setConvoStep("applying")} className="gap-2">
              Aplicar configuração
              <Send className="w-3 h-3" />
            </Button>
            <Button variant="outline" onClick={() => { setConvoStep("process"); addAssistant("Ok, vamos refazer. Descreve o teu processo de vendas."); }}>
              Refazer
            </Button>
          </motion.div>
        )}
      </div>

      {/* Text input area */}
      {(showTextInput || showCustomBusinessInput) && (
        <div className="border-t border-border px-4 py-3 bg-card">
          <div className="max-w-2xl mx-auto flex gap-2">
            {convoStep === "process" ? (
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Descreve o teu processo..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }}
              />
            ) : (
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escreve aqui..."
                onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
                autoFocus
              />
            )}
            <Button onClick={handleTextSubmit} size="icon" disabled={!textInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
