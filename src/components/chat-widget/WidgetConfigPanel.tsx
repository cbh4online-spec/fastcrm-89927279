import { useState, useEffect } from "react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Copy, ExternalLink, Palette, MessageCircle, Settings2, Code, RefreshCw, Play, Info, Bot } from "lucide-react";
import { WidgetTestChat } from "./WidgetTestChat";

interface WidgetConfig {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  position: string;
  bubble_icon: string;
  welcome_message: string;
  placeholder_text: string;
  show_branding: boolean;
  avatar_url: string | null;
  company_name: string | null;
  require_email_before_chat: boolean;
  auto_open_delay_ms: number;
  custom_css: string | null;
  is_active: boolean;
  allowed_domains: string[];
  default_flow_id: string | null;
  default_persona_id: string | null;
  default_agent_id: string | null;
  knowledge_base_ids: string[];
}

interface WidgetConfigPanelProps {
  widgetId?: string;
  onClose?: () => void;
}

export function WidgetConfigPanel({ widgetId, onClose }: WidgetConfigPanelProps) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [previewKey, setPreviewKey] = useState(0);
  const [showTestChat, setShowTestChat] = useState(false);
  const isNew = !widgetId;

  // Fetch widget config by ID
  const { data: widget, isLoading } = useQuery({
    queryKey: ["widget-config", widgetId],
    queryFn: async () => {
      if (!widgetId) return null;
      const { data, error } = await supabase
        .from("widget_configurations" as any)
        .select("id, name, primary_color, secondary_color, text_color, position, bubble_icon, welcome_message, placeholder_text, show_branding, avatar_url, company_name, require_email_before_chat, auto_open_delay_ms, custom_css, is_active, allowed_domains, default_flow_id, default_persona_id, default_agent_id, knowledge_base_ids")
        .eq("id", widgetId)
        .single();
      if (error) throw error;
      return data as unknown as WidgetConfig;
    },
    enabled: !!widgetId,
  });

  // Fetch agents (widget channel)
  const { data: agents } = useQuery({
    queryKey: ["widget-agents", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("ai_agents" as any)
        .select("id, name, channel, persona_id, flow_id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true);
      return (data as any[]) || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch flows
  const { data: flows } = useQuery({
    queryKey: ["flows-list", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("conversational_flows" as any)
        .select("id, name, status")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active");
      return (data as any[]) || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch personas
  const { data: personas } = useQuery({
    queryKey: ["personas-list", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("ai_personas")
        .select("id, name, is_active")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<WidgetConfig>>({
    name: "Novo Widget",
    primary_color: "#6366f1",
    secondary_color: "#f1f5f9",
    text_color: "#1e293b",
    position: "bottom-right",
    bubble_icon: "message-circle",
    welcome_message: "Olá! Como posso ajudar?",
    placeholder_text: "Escreva a sua mensagem...",
    show_branding: true,
    require_email_before_chat: false,
    auto_open_delay_ms: 0,
    is_active: true,
    allowed_domains: [],
    default_agent_id: null,
  });

  useEffect(() => {
    if (widget) setFormData(widget);
  }, [widget]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WidgetConfig>) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      if (widgetId) {
        const { error } = await supabase
          .from("widget_configurations" as any)
          .update(data)
          .eq("id", widgetId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("widget_configurations" as any)
          .insert({ ...data, workspace_id: currentWorkspace.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Widget guardado");
      queryClient.invalidateQueries({ queryKey: ["widget-config"] });
      queryClient.invalidateQueries({ queryKey: ["widget-list"] });
      setPreviewKey((k) => k + 1);
      if (isNew && onClose) onClose();
    },
    onError: (error) => {
      console.error("Error saving widget:", error);
      toast.error("Erro ao guardar widget");
    },
  });

  const handleSave = () => saveMutation.mutate(formData);

  const updateField = <K extends keyof WidgetConfig>(field: K, value: WidgetConfig[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // When agent is selected, show info about inherited persona/flow
  const selectedAgent = agents?.find((a: any) => a.id === formData.default_agent_id);

  const getEmbedCode = () => {
    if (!widgetId) return "";
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `<!-- FastCRM Chat Widget -->
<script>
  (function() {
    var w = document.createElement('script');
    w.src = '${getPublicBaseUrl()}/widget.js';
    w.async = true;
    w.onload = function() {
      FastCRMWidget.init({
        widgetId: '${widgetId}',
        supabaseUrl: '${supabaseUrl}'
      });
    };
    document.head.appendChild(w);
  })();
</script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    toast.success("Código copiado!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{isNew ? "Criar Widget" : "Editar Widget"}</h2>
          <p className="text-muted-foreground">
            {isNew ? "Configure um novo widget de chat" : formData.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={formData.is_active ? "default" : "secondary"}>
            {formData.is_active ? "Ativo" : "Inativo"}
          </Badge>
          {widgetId && (
            <Button variant="outline" onClick={() => setShowTestChat(true)} className="gap-2">
              <Play className="h-4 w-4" />
              Testar
            </Button>
          )}
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      {showTestChat && widgetId && (
        <WidgetTestChat
          widgetId={widgetId}
          config={{
            primary_color: formData.primary_color || "#6366f1",
            secondary_color: formData.secondary_color || "#f1f5f9",
            text_color: formData.text_color || "#1e293b",
            welcome_message: formData.welcome_message || "Olá! Como posso ajudar?",
            placeholder_text: formData.placeholder_text || "Escreva a sua mensagem...",
            company_name: formData.company_name || null,
            avatar_url: formData.avatar_url || null,
            show_branding: formData.show_branding ?? true,
          }}
          onClose={() => setShowTestChat(false)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Tabs defaultValue="appearance">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="appearance">
                <Palette className="h-4 w-4 mr-1" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="messages">
                <MessageCircle className="h-4 w-4 mr-1" />
                Mensagens
              </TabsTrigger>
              <TabsTrigger value="behavior">
                <Settings2 className="h-4 w-4 mr-1" />
                Comportamento
              </TabsTrigger>
              <TabsTrigger value="embed">
                <Code className="h-4 w-4 mr-1" />
                Embed
              </TabsTrigger>
            </TabsList>

            {/* ===== APPEARANCE TAB ===== */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Widget</Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Ex: Widget Principal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={formData.company_name || ""}
                      onChange={(e) => updateField("company_name", e.target.value)}
                      placeholder="Aparece no header do widget"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Avatar</Label>
                    <Input
                      value={formData.avatar_url || ""}
                      onChange={(e) => updateField("avatar_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Cores e Posição</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Cor Principal", field: "primary_color" as const, def: "#6366f1" },
                      { label: "Cor Secundária", field: "secondary_color" as const, def: "#f1f5f9" },
                      { label: "Cor do Texto", field: "text_color" as const, def: "#1e293b" },
                    ].map(({ label, field, def }) => (
                      <div key={field} className="space-y-2">
                        <Label>{label}</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={(formData[field] as string) || def}
                            onChange={(e) => updateField(field, e.target.value)}
                            className="h-10 w-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={(formData[field] as string) || ""}
                            onChange={(e) => updateField(field, e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Posição</Label>
                    <Select value={formData.position || "bottom-right"} onValueChange={(v) => updateField("position", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Canto inferior direito</SelectItem>
                        <SelectItem value="bottom-left">Canto inferior esquerdo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar branding FastCRM</Label>
                      <p className="text-xs text-muted-foreground">"Powered by FastCRM" no rodapé</p>
                    </div>
                    <Switch checked={formData.show_branding ?? true} onCheckedChange={(v) => updateField("show_branding", v)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== MESSAGES TAB ===== */}
            <TabsContent value="messages" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle>Mensagens</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mensagem de Boas-vindas</Label>
                    <Textarea
                      value={formData.welcome_message || ""}
                      onChange={(e) => updateField("welcome_message", e.target.value)}
                      placeholder="Olá! Como posso ajudar?"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Placeholder do Input</Label>
                    <Input
                      value={formData.placeholder_text || ""}
                      onChange={(e) => updateField("placeholder_text", e.target.value)}
                      placeholder="Escreva a sua mensagem..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== BEHAVIOR TAB ===== */}
            <TabsContent value="behavior" className="space-y-4 mt-4">
              {/* Agent Selector - TOP PRIORITY */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Agente IA
                  </CardTitle>
                  <CardDescription>
                    O agente define a personalidade, fluxo e bases de conhecimento do widget.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Agente Associado</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>O agente traz consigo persona, fluxo e knowledge bases configurados. Pode sobrepor manualmente nos campos abaixo.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={formData.default_agent_id || "none"}
                      onValueChange={(v) => updateField("default_agent_id", v === "none" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar agente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (configuração manual)</SelectItem>
                        {agents?.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} {a.channel ? `(${a.channel})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedAgent && (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Configuração herdada do agente:</p>
                      {selectedAgent.persona_id && <p>• Persona configurada no agente</p>}
                      {selectedAgent.flow_id && <p>• Fluxo configurado no agente</p>}
                      <p className="mt-1 italic">Os campos manuais abaixo funcionam como override.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Configuração Manual</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Widget Ativo</Label>
                      <p className="text-xs text-muted-foreground">Desativar esconde o widget</p>
                    </div>
                    <Switch checked={formData.is_active ?? true} onCheckedChange={(v) => updateField("is_active", v)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Fluxo Padrão (override)</Label>
                    <Select
                      value={formData.default_flow_id || "none"}
                      onValueChange={(v) => updateField("default_flow_id", v === "none" ? null : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar fluxo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (usar do agente)</SelectItem>
                        {flows?.map((flow: any) => (
                          <SelectItem key={flow.id} value={flow.id}>{flow.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Persona da IA (override)</Label>
                    <Select
                      value={formData.default_persona_id || "none"}
                      onValueChange={(v) => updateField("default_persona_id", v === "none" ? null : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar persona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Padrão (usar do agente)</SelectItem>
                        {personas?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Atraso para Abrir Automático (ms)</Label>
                    <Input
                      type="number"
                      value={formData.auto_open_delay_ms || 0}
                      onChange={(e) => updateField("auto_open_delay_ms", parseInt(e.target.value) || 0)}
                      placeholder="0 = não abre automaticamente"
                    />
                    <p className="text-xs text-muted-foreground">0 = não abre automaticamente. 5000 = abre após 5 segundos</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pedir Email Antes do Chat</Label>
                      <p className="text-xs text-muted-foreground">Requer email para iniciar conversa</p>
                    </div>
                    <Switch checked={formData.require_email_before_chat ?? false} onCheckedChange={(v) => updateField("require_email_before_chat", v)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== EMBED TAB ===== */}
            <TabsContent value="embed" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Código de Embed</CardTitle>
                  <CardDescription>Copie este código e cole antes da tag {"</body>"} do seu website</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {widgetId ? (
                    <>
                      <div className="relative">
                        <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
                          {getEmbedCode()}
                        </pre>
                        <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={copyEmbedCode}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Domínios Permitidos</Label>
                        <Textarea
                          value={(formData.allowed_domains || []).join("\n")}
                          onChange={(e) => updateField("allowed_domains", e.target.value.split("\n").filter((d) => d.trim()))}
                          placeholder={"example.com\napp.example.com\n(deixe vazio para permitir todos)"}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">Um domínio por linha. Deixe vazio para permitir todos.</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 space-y-4">
                      <div className="text-muted-foreground">
                        <Code className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Guarde primeiro</p>
                        <p className="text-sm mt-1">Guarde as configurações para gerar o código de embed.</p>
                      </div>
                      <Button onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                        Guardar e Gerar Código
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-4 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview do Widget
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 min-h-[450px] flex flex-col items-center justify-center">
              <div key={previewKey} className="rounded-xl shadow-2xl overflow-hidden border-2 border-white/50" style={{ width: '320px', maxWidth: '100%' }}>
                {/* Header */}
                <div className="p-4 flex items-center gap-3" style={{ backgroundColor: formData.primary_color || '#6366f1' }}>
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="h-10 w-10 rounded-full object-cover border-2 border-white/30" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-sm">{formData.company_name || "Assistente"}</p>
                    <p className="text-white/80 text-xs flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-400"></span>
                      Online
                    </p>
                  </div>
                </div>
                {/* Messages */}
                <div className="p-4 space-y-3" style={{ backgroundColor: formData.secondary_color || '#f1f5f9', minHeight: '220px' }}>
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: formData.primary_color || '#6366f1' }}>
                      <MessageCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="rounded-lg rounded-tl-none p-3 max-w-[85%] shadow-sm bg-white">
                      <p className="text-sm" style={{ color: formData.text_color || '#1e293b' }}>
                        {formData.welcome_message || "Olá! Como posso ajudar?"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="rounded-lg rounded-tr-none p-3 max-w-[85%] shadow-sm" style={{ backgroundColor: formData.primary_color || '#6366f1' }}>
                      <p className="text-sm text-white">Olá, gostaria de saber mais informações.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: formData.primary_color || '#6366f1' }}>
                      <MessageCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="rounded-lg rounded-tl-none p-3 max-w-[85%] shadow-sm bg-white">
                      <p className="text-sm" style={{ color: formData.text_color || '#1e293b' }}>Claro! Estou aqui para ajudar. 😊</p>
                    </div>
                  </div>
                </div>
                {/* Input */}
                <div className="p-3 border-t bg-white">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-full text-sm border bg-gray-50 text-gray-400">
                      {formData.placeholder_text || "Escreva a sua mensagem..."}
                    </div>
                    <button className="p-2 rounded-full" style={{ backgroundColor: formData.primary_color || '#6366f1' }}>
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    </button>
                  </div>
                  {formData.show_branding && (
                    <p className="text-center text-[10px] text-gray-400 mt-2">Powered by FastCRM</p>
                  )}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-4">
                📍 {formData.position === "bottom-right" ? "Canto inferior direito" : "Canto inferior esquerdo"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default WidgetConfigPanel;
