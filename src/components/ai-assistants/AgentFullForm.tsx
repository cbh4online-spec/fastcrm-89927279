/**
 * Agent Full Form - Create/Edit agent with all configurations including autopilot
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Bot, 
  Clock, 
  MessageSquare, 
  Zap,
  Users,
  BookOpen,
  Workflow,
  Moon,
  UserCheck
} from "lucide-react";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { AGENT_CHANNELS, type AIChannelAgent, type AgentChannel } from "@/types/aiChannelAgents";


interface AgentFullFormProps {
  agent?: AIChannelAgent;
  personas: Array<{ id: string; name: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  flows: Array<{ id: string; name: string }>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const HANDOFF_INTENTS = [
  { value: "sales", label: "Intenção de compra" },
  { value: "support", label: "Pedido de suporte" },
  { value: "complaint", label: "Reclamação" },
  { value: "question", label: "Dúvida" },
];



export function AgentFullForm({
  agent,
  personas,
  knowledgeBases,
  flows,
  onSubmit,
  onCancel
}: AgentFullFormProps) {
  // Basic Info
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [channel, setChannel] = useState<AgentChannel>(agent?.channel || "widget");
  const [personaId, setPersonaId] = useState(agent?.personaId || "");
  const [flowId, setFlowId] = useState(agent?.flowId || "");
  const [selectedKBs, setSelectedKBs] = useState<string[]>(agent?.knowledgeBaseIds || []);
  const [isActive, setIsActive] = useState(agent?.isActive ?? true);

  // Autopilot Settings - cast settings to expected shape
  const settings = agent?.settings as {
    autopilotEnabled?: boolean;
    responseDelayMs?: number;
    maxMessagesPerConversation?: number;
    typingIndicator?: boolean;
    respectWorkingHours?: boolean;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    workingDays?: number[];
    outOfHoursMessage?: string | null;
    autoHandoffEnabled?: boolean;
    handoffIntents?: string[];
    handoffIntentThreshold?: number;
    handoffKeywords?: string[];
    handoffOnNegativeSentiment?: boolean;
    handoffAfterBotMessages?: number | null;
    handoffNotificationMessage?: string | null;
    handoffAssignToUserId?: string | null;
  } | undefined;
  
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(settings?.autopilotEnabled ?? false);
  const [responseDelayMin, setResponseDelayMin] = useState(settings?.responseDelayMs ? Math.floor(settings.responseDelayMs / 1000) : 8);
  const [responseDelayMax, setResponseDelayMax] = useState(12);
  const [maxMessages, setMaxMessages] = useState(settings?.maxMessagesPerConversation ?? 25);
  const [typingIndicator, setTypingIndicator] = useState<boolean>(settings?.typingIndicator ?? true);
  const [sleepOnHumanReply, setSleepOnHumanReply] = useState(true);

  // Working Hours
  const [respectWorkingHours, setRespectWorkingHours] = useState<boolean>(settings?.respectWorkingHours ?? false);
  const [workingHoursStart, setWorkingHoursStart] = useState(settings?.workingHoursStart || "09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState(settings?.workingHoursEnd || "18:00");
  const [workingDays, setWorkingDays] = useState<number[]>(settings?.workingDays || [1, 2, 3, 4, 5]);
  const [outOfHoursMessage, setOutOfHoursMessage] = useState(settings?.outOfHoursMessage || "");

  // Handoff (Fase 2)
  const { data: assignableMembers } = useAgentMembers();
  const [handoffEnabled, setHandoffEnabled] = useState<boolean>(settings?.autoHandoffEnabled ?? false);
  const [handoffIntents, setHandoffIntents] = useState<string[]>(settings?.handoffIntents || ["sales"]);
  const [handoffThreshold, setHandoffThreshold] = useState<number>(
    Math.round((settings?.handoffIntentThreshold ?? 0.75) * 100)
  );
  const [handoffKeywords, setHandoffKeywords] = useState<string>((settings?.handoffKeywords || []).join(", "));
  const [handoffNegativeSentiment, setHandoffNegativeSentiment] = useState<boolean>(
    settings?.handoffOnNegativeSentiment ?? false
  );
  const [handoffAfterBotMessages, setHandoffAfterBotMessages] = useState<number>(
    settings?.handoffAfterBotMessages ?? 0
  );
  const [handoffMessage, setHandoffMessage] = useState<string>(settings?.handoffNotificationMessage || "");
  const [handoffAssignTo, setHandoffAssignTo] = useState<string>(settings?.handoffAssignToUserId || "");

  const toggleHandoffIntent = (value: string) => {
    setHandoffIntents(prev =>
      prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const data = {
      name,
      description: description || null,
      channel,
      personaId: personaId || null,
      flowId: flowId || null,
      knowledgeBaseIds: selectedKBs,
      isActive,
      settings: {
        autopilotEnabled,
        responseDelayMs: responseDelayMin * 1000,
        maxMessagesPerConversation: maxMessages,
        typingIndicator,
        sleepOnHumanReply,
        respectWorkingHours,
        workingHoursStart,
        workingHoursEnd,
        workingDays,
        outOfHoursMessage: outOfHoursMessage || null,
        // Handoff
        autoHandoffEnabled: handoffEnabled,
        handoffIntents,
        handoffIntentThreshold: handoffThreshold / 100,
        handoffKeywords: handoffKeywords
          .split(",")
          .map(k => k.trim().toLowerCase())
          .filter(Boolean),
        handoffOnNegativeSentiment: handoffNegativeSentiment,
        handoffAfterBotMessages: handoffAfterBotMessages > 0 ? handoffAfterBotMessages : null,
        handoffNotificationMessage: handoffMessage || null,
        handoffAssignToUserId: handoffAssignTo || null,
      }
    };


    onSubmit(data);
  };

  const toggleKB = (kbId: string) => {
    setSelectedKBs(prev => 
      prev.includes(kbId) 
        ? prev.filter(id => id !== kbId)
        : [...prev, kbId]
    );
  };

  const toggleDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Configuração Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Agente *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bot WhatsApp Vendas"
              />
            </div>
            <div className="space-y-2">
              <Label>Canal *</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as AgentChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_CHANNELS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded ${config.bgColor}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste agente..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Agente Ativo</Label>
              <p className="text-xs text-muted-foreground">O agente responderá a mensagens neste canal</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      {/* Intelligence */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Inteligência
          </CardTitle>
          <CardDescription>Configure a personalidade e conhecimento do agente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={personaId || "_none"} onValueChange={(v) => setPersonaId(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar persona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem persona específica</SelectItem>
                  {personas.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fluxo Conversacional</Label>
              <Select value={flowId || "_none"} onValueChange={(v) => setFlowId(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fluxo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem fluxo específico</SelectItem>
                  {flows.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bases de Conhecimento</Label>
            <div className="flex flex-wrap gap-2">
              {knowledgeBases.map(kb => (
                <Badge
                  key={kb.id}
                  variant={selectedKBs.includes(kb.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleKB(kb.id)}
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  {kb.name}
                </Badge>
              ))}
              {knowledgeBases.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma base disponível</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autopilot */}
      <Card className={autopilotEnabled ? "border-amber-500/30" : ""}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className={`h-4 w-4 ${autopilotEnabled ? "text-amber-500" : ""}`} />
                Auto-Pilot
              </CardTitle>
              <CardDescription>Respostas automáticas sem intervenção humana</CardDescription>
            </div>
            <Switch checked={autopilotEnabled} onCheckedChange={setAutopilotEnabled} />
          </div>
        </CardHeader>
        
        {autopilotEnabled && (
          <CardContent className="space-y-6">
            {/* Response Delay */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Delay de Resposta
                </Label>
                <span className="text-sm text-muted-foreground">{responseDelayMin}s</span>
              </div>
              <Slider
                value={[responseDelayMin]}
                onValueChange={(values: number[]) => setResponseDelayMin(values[0])}
                min={1}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Tempo mínimo antes de enviar resposta (simula digitação humana)
              </p>
            </div>

            <Separator />

            {/* Message Limits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Máximo de Mensagens por Conversa
                </Label>
                <span className="text-sm text-muted-foreground">{maxMessages}</span>
              </div>
              <Slider
                value={[maxMessages]}
                onValueChange={([v]) => setMaxMessages(v)}
                min={5}
                max={100}
                step={5}
              />
            </div>

            <Separator />

            {/* Behavior toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Indicador de Digitação</Label>
                  <p className="text-xs text-muted-foreground">Mostra "a escrever..." antes de responder</p>
                </div>
                <Switch checked={typingIndicator} onCheckedChange={setTypingIndicator} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Pausar com Resposta Humana</Label>
                  <p className="text-xs text-muted-foreground">Desativa autopilot se um humano responder</p>
                </div>
                <Switch checked={sleepOnHumanReply} onCheckedChange={setSleepOnHumanReply} />
              </div>
            </div>

            <Separator />

            {/* Working Hours */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Respeitar Horário de Trabalho
                  </Label>
                  <p className="text-xs text-muted-foreground">Só responde durante o expediente</p>
                </div>
                <Switch checked={respectWorkingHours} onCheckedChange={setRespectWorkingHours} />
              </div>

              {respectWorkingHours && (
                <div className="space-y-4 pl-4 border-l-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Início</Label>
                      <Input
                        type="time"
                        value={workingHoursStart}
                        onChange={(e) => setWorkingHoursStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim</Label>
                      <Input
                        type="time"
                        value={workingHoursEnd}
                        onChange={(e) => setWorkingHoursEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dias de Trabalho</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(day => (
                        <Badge
                          key={day.value}
                          variant={workingDays.includes(day.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem Fora de Horas</Label>
                    <Textarea
                      value={outOfHoursMessage}
                      onChange={(e) => setOutOfHoursMessage(e.target.value)}
                      placeholder="Olá! De momento estamos fora do horário de atendimento. Responderemos assim que possível."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Handoff — escalamento para humano */}
      <Card className={handoffEnabled ? "border-blue-500/30" : ""}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className={`h-4 w-4 ${handoffEnabled ? "text-blue-500" : ""}`} />
                Escalamento para Humano
              </CardTitle>
              <CardDescription>Quando a IA deve passar a conversa para a equipa</CardDescription>
            </div>
            <Switch checked={handoffEnabled} onCheckedChange={setHandoffEnabled} />
          </div>
        </CardHeader>

        {handoffEnabled && (
          <CardContent className="space-y-6">
            {/* Intents */}
            <div className="space-y-2">
              <Label>Intenções que acionam escalamento</Label>
              <div className="flex flex-wrap gap-2">
                {HANDOFF_INTENTS.map(intent => (
                  <Badge
                    key={intent.value}
                    variant={handoffIntents.includes(intent.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleHandoffIntent(intent.value)}
                  >
                    {intent.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                A IA classifica cada mensagem recebida e escala quando corresponde.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Confiança mínima</Label>
                <span className="text-sm text-muted-foreground">{handoffThreshold}%</span>
              </div>
              <Slider
                value={[handoffThreshold]}
                onValueChange={([v]) => setHandoffThreshold(v)}
                min={50}
                max={95}
                step={5}
              />
            </div>

            <Separator />

            {/* Keywords */}
            <div className="space-y-2">
              <Label>Palavras-chave</Label>
              <Input
                value={handoffKeywords}
                onChange={(e) => setHandoffKeywords(e.target.value)}
                placeholder="falar com humano, pessoa real, reclamação"
              />
              <p className="text-xs text-muted-foreground">
                Separadas por vírgulas. Escalam de imediato, sem análise de IA.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Sentimento negativo</Label>
                <p className="text-xs text-muted-foreground">Escalar se o cliente demonstrar frustração</p>
              </div>
              <Switch checked={handoffNegativeSentiment} onCheckedChange={setHandoffNegativeSentiment} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Escalar após N respostas da IA</Label>
                <span className="text-sm text-muted-foreground">
                  {handoffAfterBotMessages > 0 ? handoffAfterBotMessages : "Desativado"}
                </span>
              </div>
              <Slider
                value={[handoffAfterBotMessages]}
                onValueChange={([v]) => setHandoffAfterBotMessages(v)}
                min={0}
                max={20}
                step={1}
              />
            </div>

            <Separator />

            {/* Assignment + message */}
            <div className="space-y-2">
              <Label>Atribuir a</Label>
              <Select
                value={handoffAssignTo || "_none"}
                onValueChange={(v) => setHandoffAssignTo(v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Notificar toda a equipa</SelectItem>
                  {(assignableMembers || []).map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem de transição</Label>
              <Textarea
                value={handoffMessage}
                onChange={(e) => setHandoffMessage(e.target.value)}
                placeholder="Vou passar a sua questão a um colega da equipa. Respondemos em breve."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Enviada ao cliente no momento do escalamento (opcional).
              </p>
            </div>
          </CardContent>
        )}
      </Card>



      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          {agent ? "Guardar Alterações" : "Criar Agente"}
        </Button>
      </div>
    </div>
  );
}
