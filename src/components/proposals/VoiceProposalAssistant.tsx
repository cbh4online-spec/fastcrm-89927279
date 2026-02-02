import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Loader2, 
  Sparkles,
  MessageSquare,
  Volume2,
  VolumeX,
  Settings
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Web Speech API type declarations
interface SpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface VoiceScopeResult {
  objectives: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string;
}

export interface VoiceTimelinePhase {
  type: "phase" | "milestone";
  title: string;
  duration?: number;
  week?: number;
  description: string;
}

export interface VoiceTimelineResult {
  phases: VoiceTimelinePhase[];
}

export interface VoiceConditionsResult {
  paymentConditions: string;
  validityDays: number;
  notes: string;
}

export interface VoiceReferencesResult {
  projects: Array<{ title: string; description: string }>;
  testimonial: { quote: string; author: string; company: string; role?: string };
  certifications: string[];
}

interface VoiceProposalAssistantProps {
  proposalData: {
    id: string;
    title: string;
    price: number;
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  onScopeGenerated?: (scope: VoiceScopeResult) => void;
  onTimelineGenerated?: (timeline: VoiceTimelineResult) => void;
  onConditionsGenerated?: (conditions: VoiceConditionsResult) => void;
  onReferencesGenerated?: (references: VoiceReferencesResult) => void;
}

export function VoiceProposalAssistant({
  proposalData,
  onScopeGenerated,
  onTimelineGenerated,
  onConditionsGenerated,
  onReferencesGenerated,
}: VoiceProposalAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showAgentIdDialog, setShowAgentIdDialog] = useState(false);
  const [agentId, setAgentId] = useState<string>(() => {
    return localStorage.getItem("elevenlabs_agent_id") || "";
  });
  const [tempAgentId, setTempAgentId] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);

  const processVoiceCommand = useCallback(async (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    setIsSpeaking(true);

    try {
      if (lowerCommand.includes("gerar âmbito") || lowerCommand.includes("criar âmbito")) {
        const response = await callAIForVoice("generate_scope");
        if (response && onScopeGenerated) {
          onScopeGenerated(response);
          speak("Âmbito gerado com sucesso!");
        }
      } else if (lowerCommand.includes("gerar cronograma") || lowerCommand.includes("criar cronograma")) {
        const response = await callAIForVoice("generate_timeline");
        if (response && onTimelineGenerated) {
          onTimelineGenerated(response);
          speak("Cronograma gerado com sucesso!");
        }
      } else if (lowerCommand.includes("sugerir condições") || lowerCommand.includes("condições de pagamento")) {
        const response = await callAIForVoice("suggest_conditions");
        if (response && onConditionsGenerated) {
          onConditionsGenerated(response);
          speak("Condições sugeridas com sucesso!");
        }
      } else if (lowerCommand.includes("sugerir referências") || lowerCommand.includes("casos de sucesso")) {
        const response = await callAIForVoice("suggest_references");
        if (response && onReferencesGenerated) {
          onReferencesGenerated(response);
          speak("Referências sugeridas com sucesso!");
        }
      } else if (lowerCommand.includes("analisar proposta") || lowerCommand.includes("avaliar proposta")) {
        const response = await callAIForVoice("analyze");
        if (response) {
          const score = response.successScore || 0;
          speak(`A proposta tem um score de sucesso de ${score} por cento. ${response.summary || ""}`);
        }
      } else {
        const response = await callAICopilot(command);
        if (response) {
          speak(response);
        }
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
      speak("Desculpe, ocorreu um erro ao processar o seu pedido.");
    } finally {
      setIsSpeaking(false);
    }
  }, [onScopeGenerated, onTimelineGenerated, onConditionsGenerated, onReferencesGenerated, proposalData]);

  const callAIForVoice = async (mode: string) => {
    const { data, error } = await supabase.functions.invoke("ai-proposal-assistant", {
      body: {
        mode,
        proposalData: {
          id: proposalData.id,
          title: proposalData.title,
          price: proposalData.price,
          status: "draft",
          items: proposalData.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        },
      },
    });

    if (error) {
      console.error("AI error:", error);
      throw error;
    }

    return data;
  };

  const callAICopilot = async (question: string) => {
    const { data, error } = await supabase.functions.invoke("ai-proposal-assistant", {
      body: {
        mode: "copilot",
        proposalData: {
          id: proposalData.id,
          title: proposalData.title,
          price: proposalData.price,
          status: "draft",
          items: proposalData.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        },
        question,
      },
    });

    if (error) {
      console.error("Copilot error:", error);
      throw error;
    }

    return data?.response;
  };

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-PT";
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI = (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      toast.error("O seu browser não suporta reconhecimento de voz");
      return;
    }

    const recognitionInstance = new SpeechRecognitionAPI();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = "pt-PT";

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => [...prev, finalTranscript]);
        processVoiceCommand(finalTranscript);
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Permissão de microfone negada");
      }
    };

    recognitionInstance.onend = () => {
      if (isConnected && !isMuted && recognition) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    setRecognition(recognitionInstance);
    recognitionInstance.start();
    setIsConnected(true);
    toast.success("Assistente de voz activado");
  }, [isConnected, isMuted, recognition, processVoiceCommand]);

  const handleConnect = async () => {
    if (!agentId) {
      // Use native speech recognition without ElevenLabs agent
      startSpeechRecognition();
      return;
    }

    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-proposal-token", {
        body: { agentId },
      });

      if (error || data?.error) {
        console.log("ElevenLabs not available, using Web Speech API");
        startSpeechRecognition();
      } else {
        startSpeechRecognition();
        toast.success("Conectado ao assistente de voz");
      }
    } catch (error) {
      console.error("Connection error:", error);
      startSpeechRecognition();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    window.speechSynthesis?.cancel();
    setIsConnected(false);
    setTranscript([]);
    toast.info("Assistente de voz desactivado");
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      if (!prev && recognition) {
        recognition.stop();
      } else if (prev && recognition) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
      return !prev;
    });
  };

  const handleSaveAgentId = () => {
    if (tempAgentId.trim()) {
      localStorage.setItem("elevenlabs_agent_id", tempAgentId.trim());
      setAgentId(tempAgentId.trim());
    }
    setShowAgentIdDialog(false);
    toast.success("Configuração guardada");
    setTimeout(() => handleConnect(), 100);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-600 hover:from-purple-500/20 hover:to-pink-500/20"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Voz</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Assistente de Voz IA
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      isConnected
                        ? isSpeaking
                          ? "bg-purple-500 animate-pulse"
                          : "bg-green-500"
                        : "bg-muted"
                    )}
                  />
                  <div>
                    <p className="font-medium">
                      {isConnected
                        ? isSpeaking
                          ? "A processar..."
                          : "A ouvir"
                        : "Desconectado"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isConnected
                        ? "Fale para interagir com a proposta"
                        : "Clique para activar o assistente"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className={isMuted ? "text-destructive" : ""}
                      >
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.speechSynthesis?.cancel()}
                      >
                        <VolumeX className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setTempAgentId(agentId);
                      setShowAgentIdDialog(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={isConnected ? "destructive" : "default"}
                    size="sm"
                    onClick={isConnected ? handleDisconnect : handleConnect}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isConnected ? (
                      <PhoneOff className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                    {isConnected ? "Terminar" : "Iniciar"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comandos de Voz
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">Âmbito</Badge>
                  <span className="text-muted-foreground">"Gerar âmbito" ou "Criar âmbito"</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">Cronograma</Badge>
                  <span className="text-muted-foreground">"Gerar cronograma" ou "Criar cronograma"</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">Condições</Badge>
                  <span className="text-muted-foreground">"Sugerir condições" ou "Condições de pagamento"</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">Referências</Badge>
                  <span className="text-muted-foreground">"Sugerir referências" ou "Casos de sucesso"</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0">Análise</Badge>
                  <span className="text-muted-foreground">"Analisar proposta" ou "Avaliar proposta"</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">Perguntas</Badge>
                  <span className="text-muted-foreground">Faça qualquer pergunta sobre a proposta</span>
                </div>
              </div>
            </Card>

            {transcript.length > 0 && (
              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Transcrição
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {transcript.map((text, index) => (
                    <div key={index} className="text-sm p-2 bg-muted rounded-lg">
                      {text}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-4 bg-muted/50">
              <h4 className="font-medium mb-2 text-sm">Contexto da Proposta</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Título:</strong> {proposalData.title || "Sem título"}</p>
                <p><strong>Valor:</strong> €{proposalData.price?.toLocaleString() || 0}</p>
                <p><strong>Itens:</strong> {proposalData.items?.length || 0}</p>
              </div>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showAgentIdDialog} onOpenChange={setShowAgentIdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar ElevenLabs Agent</DialogTitle>
            <DialogDescription>
              Para usar o assistente de voz avançado, insira o ID do seu agente ElevenLabs.
              Pode encontrar isso no painel da ElevenLabs em Conversational AI → Agents.
              Se deixar em branco, será usado o reconhecimento de voz nativo do browser.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID (opcional)</Label>
              <Input
                id="agentId"
                placeholder="ex: abc123xyz..."
                value={tempAgentId}
                onChange={(e) => setTempAgentId(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentIdDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAgentId}>
              Guardar e Conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
