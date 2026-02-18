import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotTypeCard } from "./BotTypeCard";
import { BotType, CreateBotData, useBots } from "@/hooks/useBots";
import { ArrowLeft, ArrowRight, Check, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIProfiles } from "@/hooks/useAIProfiles";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";

const CHANNELS = [
  { value: "widget", label: "Website Widget" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram DM" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const STEPS = [
  { id: 1, label: "Tipo" },
  { id: 2, label: "Identidade" },
  { id: 3, label: "Configuração" },
  { id: 4, label: "Ativação" },
];

export function BotWizard() {
  const navigate = useNavigate();
  const { createBot } = useBots();
  const { profiles: aiProfiles } = useAIProfiles();
  const { knowledgeBases } = useKnowledgeBase();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<CreateBotData>>({
    type: null as unknown as BotType,
    knowledge_base_ids: [],
  });

  const setField = (key: keyof CreateBotData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const canNext = () => {
    if (step === 1) return !!form.type;
    if (step === 2) return !!(form.name?.trim());
    return true;
  };

  const handleSubmit = async () => {
    if (!form.type || !form.name) return;
    const result = await createBot.mutateAsync(form as CreateBotData);
    navigate(`/dashboard/ai-employees/${result.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/ai-employees")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> Criar AI Employee
          </h1>
        </div>
        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s.id ? <Check className="w-3 h-3" /> : s.id}
              </div>
              <span className={cn("text-xs hidden sm:block", step === s.id ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("w-8 h-px mx-1", step > s.id ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step 1 - Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Escolhe o modo de criação</h2>
              <p className="text-muted-foreground text-sm">Seleciona como queres configurar o teu AI Employee.</p>
            </div>
            <BotTypeCard selected={form.type ?? null} onSelect={t => setField("type", t)} />
          </div>
        )}

        {/* Step 2 - Identity */}
        {step === 2 && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold mb-1">Identidade do AI Employee</h2>
              <p className="text-muted-foreground text-sm">Define o nome e a descrição do teu operador digital.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Assistente de Vendas, Sofia, AI Support..."
                  value={form.name || ""}
                  onChange={e => setField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="O que faz este AI Employee? Para que canais? Que objetivo tem?"
                  value={form.description || ""}
                  onChange={e => setField("description", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Canal principal</Label>
                <Select value={form.channel || ""} onValueChange={v => setField("channel", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar canal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Config */}
        {step === 3 && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold mb-1">Configuração de IA</h2>
              <p className="text-muted-foreground text-sm">Associa uma persona e base de conhecimento.</p>
            </div>
            <div className="space-y-4">
              {form.type === "prompt" && (
                <div className="space-y-2">
                  <Label>Persona IA</Label>
                  <Select value={form.ai_profile_id || ""} onValueChange={v => setField("ai_profile_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar persona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProfiles.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.type === "prompt" && (
                <div className="space-y-2">
                  <Label>Prompt do Sistema</Label>
                  <Textarea
                    placeholder="Instruções detalhadas para o AI Employee..."
                    value={form.system_prompt || ""}
                    onChange={e => setField("system_prompt", e.target.value)}
                    rows={6}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Bases de Conhecimento (RAG)</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {knowledgeBases.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma base de conhecimento disponível.
                    </p>
                  ) : (
                    knowledgeBases.map((kb: any) => (
                      <label key={kb.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2">
                        <input
                          type="checkbox"
                          checked={(form.knowledge_base_ids || []).includes(kb.id)}
                          onChange={e => {
                            const ids = form.knowledge_base_ids || [];
                            setField(
                              "knowledge_base_ids",
                              e.target.checked ? [...ids, kb.id] : ids.filter(id => id !== kb.id)
                            );
                          }}
                          className="rounded"
                        />
                        <div>
                          <p className="text-sm font-medium">{kb.name}</p>
                          {kb.description && <p className="text-xs text-muted-foreground">{kb.description}</p>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 - Review */}
        {step === 4 && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold mb-1">Pronto para ativar!</h2>
              <p className="text-muted-foreground text-sm">Revê o resumo antes de criar o teu AI Employee.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{form.name}</h3>
                  <p className="text-sm text-muted-foreground">{form.description || "Sem descrição"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Modo</p>
                  <Badge variant="outline" className="capitalize">{form.type}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Canal</p>
                  <Badge variant="outline" className="capitalize">{form.channel || "Não definido"}</Badge>
                </div>
                {(form.knowledge_base_ids?.length || 0) > 0 && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs text-muted-foreground">Knowledge Bases</p>
                    <p className="text-sm">{form.knowledge_base_ids?.length} selecionada(s)</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O bot será criado em modo <strong>rascunho</strong>. Poderás ativá-lo após a configuração completa.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/dashboard/ai-employees")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? "Cancelar" : "Anterior"}
        </Button>
        {step < STEPS.length ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            Próximo <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createBot.isPending}>
            {createBot.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Criar AI Employee
          </Button>
        )}
      </div>
    </div>
  );
}
