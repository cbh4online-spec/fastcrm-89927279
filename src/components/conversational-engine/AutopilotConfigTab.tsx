/**
 * Autopilot Configuration Tab
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bot,
  Clock,
  MessageSquare,
  Shield,
  Settings,
  Save,
  Power,
  Calendar,
  Image,
  Mic,
  FileText,
} from "lucide-react";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import type { AutopilotConfig } from "@/types/conversational-engine";
import { WORKING_DAYS_OPTIONS, TIMEZONE_OPTIONS } from "@/types/conversational-engine";
import { toast } from "sonner";

export function AutopilotConfigTab() {
  const { config, isLoading, defaultConfig, upsertConfig, toggleActive, isSaving } =
    useAutopilotConfig();
  
  const [formData, setFormData] = useState<Partial<AutopilotConfig>>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    } else {
      setFormData(defaultConfig);
    }
    setHasChanges(false);
  }, [config]);

  const updateField = <K extends keyof AutopilotConfig>(
    field: K,
    value: AutopilotConfig[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await upsertConfig(formData as any);
      setHasChanges(false);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleWorkingDay = (day: number) => {
    const current = formData.working_days || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    updateField("working_days", updated);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isActive = config?.is_active ?? false;

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className={isActive ? "border-green-500" : "border-muted"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  isActive ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                }`}
              >
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Auto-Pilot</h3>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? "A IA está a responder automaticamente"
                    : "A IA aguarda aprovação manual para cada resposta"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "ATIVO" : "INATIVO"}
              </Badge>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => {
                  if (config?.id) {
                    toggleActive(checked);
                  } else {
                    // Need to save config first
                    toast.error("Guarde a configuração primeiro");
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timing de Resposta
          </CardTitle>
          <CardDescription>
            Simula comportamento humano com delays naturais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Delay Mínimo: {formData.response_delay_min}s</Label>
              <Slider
                value={[formData.response_delay_min || 8]}
                onValueChange={([v]) => updateField("response_delay_min", v)}
                min={1}
                max={30}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Delay Máximo: {formData.response_delay_max}s</Label>
              <Slider
                value={[formData.response_delay_max || 12]}
                onValueChange={([v]) => updateField("response_delay_max", v)}
                min={1}
                max={60}
                step={1}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Indicador "A escrever..."</Label>
              <p className="text-xs text-muted-foreground">
                Mostra animação de digitação antes de responder
              </p>
            </div>
            <Switch
              checked={formData.typing_indicator}
              onCheckedChange={(v) => updateField("typing_indicator", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversation Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Limites de Conversa
          </CardTitle>
          <CardDescription>Controla o volume de mensagens automáticas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Máx. Mensagens por Conversa: {formData.max_messages_per_conversation}</Label>
              <Slider
                value={[formData.max_messages_per_conversation || 25]}
                onValueChange={([v]) => updateField("max_messages_per_conversation", v)}
                min={5}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. Mensagens Bot Seguidas: {formData.max_consecutive_bot_messages}</Label>
              <Slider
                value={[formData.max_consecutive_bot_messages || 3]}
                onValueChange={([v]) => updateField("max_consecutive_bot_messages", v)}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Pausar quando humano responde</Label>
                <p className="text-xs text-muted-foreground">
                  Desativa auto-reply quando agente humano intervém
                </p>
              </div>
              <Switch
                checked={formData.sleep_on_human_reply}
                onCheckedChange={(v) => updateField("sleep_on_human_reply", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Reativar automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  Reativa após {formData.reactivation_hours || 24}h sem atividade
                </p>
              </div>
              <Switch
                checked={formData.auto_reactivate}
                onCheckedChange={(v) => updateField("auto_reactivate", v)}
              />
            </div>

            {formData.auto_reactivate && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label>Horas para Reativar: {formData.reactivation_hours}h</Label>
                <Slider
                  value={[formData.reactivation_hours || 24]}
                  onValueChange={([v]) => updateField("reactivation_hours", v)}
                  min={1}
                  max={72}
                  step={1}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Horário de Funcionamento
          </CardTitle>
          <CardDescription>Define quando o Auto-Pilot está ativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Respeitar Horário de Trabalho</Label>
              <p className="text-xs text-muted-foreground">
                Auto-Pilot só responde durante o horário definido
              </p>
            </div>
            <Switch
              checked={formData.respect_working_hours ?? false}
              onCheckedChange={(v) => updateField("respect_working_hours", v)}
            />
          </div>

          {formData.respect_working_hours && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={formData.working_hours_start || "09:00"}
                    onChange={(e) => updateField("working_hours_start", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={formData.working_hours_end || "18:00"}
                    onChange={(e) => updateField("working_hours_end", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fuso Horário</Label>
                  <Select
                    value={formData.timezone || "Europe/Lisbon"}
                    onValueChange={(v) => updateField("timezone", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias de Trabalho</Label>
                <div className="flex flex-wrap gap-2">
                  {WORKING_DAYS_OPTIONS.map((day) => (
                    <div
                      key={day.value}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        formData.working_days?.includes(day.value)
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:bg-muted"
                      }`}
                      onClick={() => toggleWorkingDay(day.value)}
                    >
                      <Checkbox
                        checked={formData.working_days?.includes(day.value)}
                        onCheckedChange={() => toggleWorkingDay(day.value)}
                      />
                      <span className="text-sm">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="out_of_hours_message">Mensagem Fora de Horas</Label>
                <Textarea
                  id="out_of_hours_message"
                  value={formData.out_of_hours_message || ""}
                  onChange={(e) => updateField("out_of_hours_message", e.target.value)}
                  placeholder="Obrigado pelo contacto. De momento estamos fora do horário de atendimento..."
                  rows={2}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Handling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Capacidades
          </CardTitle>
          <CardDescription>O que o Auto-Pilot consegue processar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                <Label>Imagens</Label>
              </div>
              <Switch
                checked={formData.accept_images}
                onCheckedChange={(v) => updateField("accept_images", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <Label>Áudio</Label>
              </div>
              <Switch
                checked={formData.accept_voice}
                onCheckedChange={(v) => updateField("accept_voice", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label>Ficheiros</Label>
              </div>
              <Switch
                checked={formData.accept_files}
                onCheckedChange={(v) => updateField("accept_files", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "A guardar..." : "Guardar Configuração"}
          </Button>
        </div>
      )}
    </div>
  );
}
