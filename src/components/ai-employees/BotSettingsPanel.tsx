import { useState, useEffect } from "react";
import { Bot, useBots } from "@/hooks/useBots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Play, Pause, Bot as BotIcon } from "lucide-react";
import { useAIProfiles } from "@/hooks/useAIProfiles";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { toast } from "sonner";

const CHANNELS = [
  { value: "widget", label: "Website Widget" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram DM" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface BotSettingsPanelProps {
  bot: Bot;
}

export function BotSettingsPanel({ bot }: BotSettingsPanelProps) {
  const { updateBot, toggleStatus } = useBots();
  const { profiles: aiProfiles } = useAIProfiles();
  const { knowledgeBases } = useKnowledgeBase();

  const [form, setForm] = useState({ ...bot });
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setForm({ ...bot }); setDirty(false); }, [bot.id]);

  const set = (key: keyof Bot, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const setSetting = (key: keyof Bot["settings"], value: unknown) => {
    setForm(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    await updateBot.mutateAsync({ id: bot.id, ...form });
    setDirty(false);
  };

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BotIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{form.name}</p>
            <Badge
              variant="outline"
              className={
                bot.status === "active"
                  ? "border-emerald-500/30 text-[10px]"
                  : "text-muted-foreground text-[10px]"
              }
            >
              {bot.status === "active" ? "Ativo" : bot.status === "paused" ? "Pausado" : "Rascunho"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {bot.status !== "active" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
              onClick={() => toggleStatus.mutate({ id: bot.id, status: "active" })}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Ativar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => toggleStatus.mutate({ id: bot.id, status: "paused" })}
            >
              <Pause className="w-3.5 h-3.5 mr-1.5" /> Pausar
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!dirty || updateBot.isPending}>
            {updateBot.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Identity */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Identidade</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={form.channel || ""} onValueChange={v => set("channel", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar canal..." /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} />
        </div>
      </div>

      <Separator />

      {/* AI Config */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">IA & Conhecimento</h3>
        {form.type === "prompt" && (
          <div className="space-y-2">
            <Label>Persona IA</Label>
            <Select value={form.ai_profile_id || ""} onValueChange={v => set("ai_profile_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar persona..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {aiProfiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {form.type === "prompt" && (
          <div className="space-y-2">
            <Label>Prompt do Sistema</Label>
            <Textarea
              value={form.system_prompt || ""}
              onChange={e => set("system_prompt", e.target.value)}
              rows={6}
              placeholder="Instruções detalhadas para o AI Employee..."
            />
          </div>
        )}
        <div className="space-y-2">
          <Label>Bases de Conhecimento</Label>
          <div className="space-y-2 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
            {knowledgeBases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhuma KB disponível</p>
            ) : knowledgeBases.map((kb: any) => (
              <label key={kb.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1.5">
                <input
                  type="checkbox"
                  checked={(form.knowledge_base_ids || []).includes(kb.id)}
                  onChange={e => {
                    const ids = form.knowledge_base_ids || [];
                    set("knowledge_base_ids", e.target.checked ? [...ids, kb.id] : ids.filter(id => id !== kb.id));
                  }}
                />
                <span className="text-sm">{kb.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Behavior Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Comportamento</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Delay de resposta (ms)</Label>
            <Input
              type="number"
              value={form.settings?.response_delay_ms || 1500}
              onChange={e => setSetting("response_delay_ms", parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Máx. mensagens por conversa</Label>
            <Input
              type="number"
              value={form.settings?.max_messages_per_conversation || 50}
              onChange={e => setSetting("max_messages_per_conversation", parseInt(e.target.value))}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Indicador de digitação</p>
            <p className="text-xs text-muted-foreground">Simula que o bot está a escrever</p>
          </div>
          <Switch
            checked={form.settings?.typing_indicator ?? true}
            onCheckedChange={v => setSetting("typing_indicator", v)}
          />
        </div>
      </div>

      <Separator />

      {/* Handover */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Transferência para Humano</h3>
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Handover automático</p>
            <p className="text-xs text-muted-foreground">Transfere conversa com base em palavras-chave</p>
          </div>
          <Switch
            checked={form.settings?.handover_enabled ?? false}
            onCheckedChange={v => setSetting("handover_enabled", v)}
          />
        </div>
        {form.settings?.handover_enabled && (
          <div className="space-y-2">
            <Label>Palavras-chave de handover</Label>
            <Input
              placeholder="humano, falar com pessoa, suporte... (separadas por vírgula)"
              value={(form.settings?.trigger_keywords || []).join(", ")}
              onChange={e => setSetting("trigger_keywords", e.target.value.split(",").map(k => k.trim()).filter(Boolean))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
