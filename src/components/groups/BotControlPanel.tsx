/**
 * BotControlPanel - Simplified bot configuration for group context
 */

import { useState, useEffect } from "react";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Brain, BookOpen, Clock, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BotControlPanelProps {
  groupId: string;
}

interface PersonaOption {
  id: string;
  name: string;
  tone_of_voice: string | null;
}

interface KnowledgeBaseOption {
  id: string;
  name: string;
}

interface AgentConfig {
  id: string;
  persona_id: string | null;
  knowledge_base_id: string | null;
  is_active: boolean;
}

const sb = supabase as any;

export function BotControlPanel({ groupId }: BotControlPanelProps) {
  const { currentWorkspace } = useWorkspace();
  const { config, isActive, toggleActive, isLoading: configLoading } = useAutopilotConfig();
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseOption[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [selectedKB, setSelectedKB] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    loadOptions();
  }, [currentWorkspace?.id]);

  const loadOptions = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const [personasRes, kbRes, agentRes] = await Promise.all([
        sb.from("ai_personas").select("id, name, tone_of_voice").eq("workspace_id", currentWorkspace.id).order("name"),
        sb.from("knowledge_bases").select("id, name").eq("workspace_id", currentWorkspace.id).order("name"),
        sb.from("ai_channel_agents").select("id, persona_id, knowledge_base_ids, is_active").eq("workspace_id", currentWorkspace.id).eq("channel", "live_chat").maybeSingle(),
      ]);

      setPersonas(personasRes.data || []);
      setKnowledgeBases(kbRes.data || []);

      if (agentRes.data) {
        setSelectedPersona(agentRes.data.persona_id || "");
        const kbIds = agentRes.data.knowledge_base_ids;
        if (Array.isArray(kbIds) && kbIds.length > 0) {
          setSelectedKB(kbIds[0]);
        }
      }
    } catch (err) {
      console.error("Error loading bot options:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await toggleActive(!isActive);
    } finally {
      setToggling(false);
    }
  };

  const handleSaveAgent = async () => {
    if (!currentWorkspace?.id) return;
    setSaving(true);
    try {
      // Find or create a channel agent for this context
      const { data: existing } = await sb
        .from("ai_channel_agents")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("channel", "live_chat")
        .maybeSingle();

      const agentData = {
        persona_id: selectedPersona || null,
        knowledge_base_ids: selectedKB ? [selectedKB] : [],
        is_active: isActive,
      };

      if (existing) {
        await sb.from("ai_channel_agents").update(agentData).eq("id", existing.id);
      } else {
        await sb.from("ai_channel_agents").insert({
          ...agentData,
          workspace_id: currentWorkspace.id,
          name: "Agente Grupo",
          channel: "live_chat",
          priority: 1,
          settings: {},
        });
      }

      toast.success("Configuração do bot guardada");
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const activePersona = personas.find(p => p.id === selectedPersona);

  if (loading || configLoading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      {/* Autopilot Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            isActive ? "bg-green-500/10" : "bg-muted"
          )}>
            <Bot className={cn("h-5 w-5", isActive ? "text-green-500" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-sm font-medium">Auto-Pilot</p>
            <p className="text-xs text-muted-foreground">
              {isActive ? "Respostas automáticas ativas" : "Bot desativado"}
            </p>
          </div>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={toggling}
        />
      </div>

      <Separator />

      {/* Persona Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Brain className="h-3.5 w-3.5" />
          Persona Ativa
        </Label>
        <Select value={selectedPersona} onValueChange={setSelectedPersona}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar persona..." />
          </SelectTrigger>
          <SelectContent>
            {personas.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activePersona?.tone_of_voice && (
          <p className="text-xs text-muted-foreground italic">
            Tom: {activePersona.tone_of_voice}
          </p>
        )}
      </div>

      {/* Knowledge Base Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          Base de Conhecimento
        </Label>
        <Select value={selectedKB} onValueChange={setSelectedKB}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar base..." />
          </SelectTrigger>
          <SelectContent>
            {knowledgeBases.map(kb => (
              <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Quick Config Preview */}
      {config && isActive && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground">Configurações Ativas</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>Delay: {config.response_delay_min === 0 && config.response_delay_max === 0 ? "Imediato" : `${config.response_delay_min}-${config.response_delay_max}s`}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span>Máx: {config.max_messages_per_conversation} msgs</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px]">
              Pausa humano: {config.sleep_on_human_reply ? "Sim" : "Não"}
            </Badge>
            {config.respect_working_hours && (
              <Badge variant="outline" className="text-[10px]">
                Horário: {config.working_hours_start}-{config.working_hours_end}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSaveAgent}
        disabled={saving}
        className="w-full"
        size="sm"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Guardar Configuração
      </Button>
    </div>
  );
}
