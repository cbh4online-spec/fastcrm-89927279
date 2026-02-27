import { useState, useMemo, useCallback } from "react";
import { LinkedConversationsCard } from "./LinkedConversationsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  Sparkles,
  FileText,
  Send,
  Mail,
  Phone,
  Instagram,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Scissors,
  ArrowRight,
  Smile,
  Briefcase,
  Target,
  Calendar,
  Lightbulb,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Wand2,
  Plus,
  Clock,
  MessageCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTemplates, Template, TemplateGoal } from "@/hooks/useTemplates";
import { useAskAI, ReplySuggestion } from "@/hooks/useAskAI";
import { TemplateFormDialog } from "@/components/communication/TemplateFormDialog";
import { CommunicationTemplate, TemplateChannel } from "@/types/communicationTemplate";
import { ComposeEmailDialog } from "@/components/email";

interface ContactMessagesSectionProps {
  entityType: 'contact' | 'company' | 'lead';
  entityId: string;
  entityName: string;
  entityEmail?: string | null;
  entityPhone?: string | null;
}

type MessageChannel = 'email' | 'whatsapp' | 'instagram' | 'sms';

interface MessageDraft {
  channel: MessageChannel;
  subject?: string;
  content: string;
  isAIDraft: boolean;
}

const channelConfig: Record<MessageChannel, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  templateType: string;
}> = {
  email: { 
    icon: Mail, 
    label: "Email", 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    templateType: "email"
  },
  whatsapp: { 
    icon: Phone, 
    label: "WhatsApp", 
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    templateType: "whatsapp"
  },
  instagram: { 
    icon: Instagram, 
    label: "Instagram", 
    color: "bg-pink-500/10 text-pink-600 border-pink-500/30",
    templateType: "instagram_dm"
  },
  sms: { 
    icon: MessageCircle, 
    label: "SMS", 
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    templateType: "sms"
  },
};

const goalConfig: Record<TemplateGoal, { icon: React.ElementType; label: string; color: string }> = {
  qualification: { icon: Target, label: "Qualificação", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  follow_up: { icon: MessageCircle, label: "Follow-up", color: "bg-green-500/10 text-green-700 border-green-500/30" },
  booking: { icon: Calendar, label: "Agendamento", color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  closing: { icon: Check, label: "Fecho", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  support: { icon: Lightbulb, label: "Suporte", color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30" },
  other: { icon: FileText, label: "Outro", color: "bg-gray-500/10 text-gray-700 border-gray-500/30" },
};

export function ContactMessagesSection({
  entityType,
  entityId,
  entityName,
  entityEmail,
  entityPhone,
}: ContactMessagesSectionProps) {
  const { data: templates = [], isLoading: templatesLoading } = useTemplates({ isActive: true });
  const { isLoading: aiLoading, suggestReplies } = useAskAI();
  
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'ai'>('compose');
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>('email');
  const [draft, setDraft] = useState<MessageDraft>({
    channel: 'email',
    subject: '',
    content: '',
    isAIDraft: false,
  });
  
  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CommunicationTemplate | null>(null);
  
  // AI state
  const [aiSuggestions, setAiSuggestions] = useState<ReplySuggestion[] | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContext, setAiContext] = useState('');
  
  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  const currentChannelConfig = channelConfig[selectedChannel];
  const ChannelIcon = currentChannelConfig.icon;

  // Filter templates by channel
  const filteredTemplates = useMemo(() => {
    let filtered = templates.filter(t => 
      t.type === currentChannelConfig.templateType || t.type === 'email'
    );
    
    if (templateSearch) {
      const query = templateSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.content.toLowerCase().includes(query)
      );
    }
    
    // Sort by usage
    filtered.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    
    return showAllTemplates ? filtered : filtered.slice(0, 6);
  }, [templates, currentChannelConfig.templateType, templateSearch, showAllTemplates]);

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId),
  [templates, selectedTemplateId]);

  // Handle channel change
  const handleChannelChange = useCallback((channel: MessageChannel) => {
    setSelectedChannel(channel);
    setDraft(prev => ({ ...prev, channel }));
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplateId(template.id);
    
    // Replace variables with entity data
    let content = template.content
      .replace(/\{\{nome\}\}/gi, entityName)
      .replace(/\{\{name\}\}/gi, entityName)
      .replace(/\{\{email\}\}/gi, entityEmail || '')
      .replace(/\{\{telefone\}\}/gi, entityPhone || '')
      .replace(/\{\{phone\}\}/gi, entityPhone || '');
    
    let subject = template.subject || '';
    subject = subject
      .replace(/\{\{nome\}\}/gi, entityName)
      .replace(/\{\{name\}\}/gi, entityName);
    
    setDraft({
      channel: selectedChannel,
      subject,
      content,
      isAIDraft: false,
    });
    
    setActiveTab('compose');
    toast.success("Template aplicado");
  }, [entityName, entityEmail, entityPhone, selectedChannel]);

  // Generate AI suggestions
  const handleGenerateAISuggestions = useCallback(async () => {
    setIsGenerating(true);
    setAiSuggestions(null);
    setSelectedSuggestion(null);
    
    try {
      // Create context messages for the AI
      const contextMessages = [
        {
          role: 'system',
          content: `Contexto: A comunicar com ${entityName}. ${aiContext ? `Contexto adicional: ${aiContext}` : ''}`
        },
        {
          role: 'user',
          content: `Gera sugestões de mensagem para ${selectedChannel} para ${entityName}.`
        }
      ];
      
      const result = await suggestReplies(contextMessages);
      if (result?.suggestions) {
        setAiSuggestions(result.suggestions);
      }
    } catch (error) {
      toast.error("Erro ao gerar sugestões");
    } finally {
      setIsGenerating(false);
    }
  }, [entityName, selectedChannel, aiContext, suggestReplies]);

  // Use AI suggestion
  const handleUseSuggestion = useCallback((text: string) => {
    setSelectedSuggestion(text);
    setDraft({
      channel: selectedChannel,
      subject: draft.subject,
      content: text,
      isAIDraft: true,
    });
    setActiveTab('compose');
    toast.success("Sugestão AI aplicada");
  }, [selectedChannel, draft.subject]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    const fullContent = draft.subject 
      ? `Assunto: ${draft.subject}\n\n${draft.content}`
      : draft.content;
    navigator.clipboard.writeText(fullContent);
    toast.success("Copiado!");
  }, [draft]);

  // Send/Open in channel
  const handleSend = useCallback(() => {
    if (!draft.content.trim()) {
      toast.error("Escreva uma mensagem primeiro");
      return;
    }
    
    const encodedContent = encodeURIComponent(draft.content);
    const encodedSubject = encodeURIComponent(draft.subject || '');
    
    switch (selectedChannel) {
      case 'email':
        if (entityEmail) {
          // Open the email dialog instead of mailto:
          setShowEmailDialog(true);
        } else {
          toast.error("Email não disponível");
        }
        break;
      case 'whatsapp':
        if (entityPhone) {
          const cleanPhone = entityPhone.replace(/\D/g, '');
          window.open(`https://wa.me/${cleanPhone}?text=${encodedContent}`, '_blank');
        } else {
          toast.error("Telefone não disponível");
        }
        break;
      case 'sms':
        if (entityPhone) {
          window.open(`sms:${entityPhone}?body=${encodedContent}`, '_blank');
        } else {
          toast.error("Telefone não disponível");
        }
        break;
      default:
        handleCopy();
        toast.info("Mensagem copiada - cole no canal desejado");
    }
  }, [draft, selectedChannel, entityEmail, entityPhone, handleCopy]);

  // Modify draft with AI
  const handleModifyDraft = useCallback(async (action: 'shorten' | 'formal' | 'friendly' | 'rewrite') => {
    if (!draft.content.trim()) {
      toast.error("Escreva uma mensagem primeiro");
      return;
    }
    
    setIsGenerating(true);
    try {
      const actionPrompts: Record<string, string> = {
        shorten: "Encurta esta mensagem mantendo o essencial",
        formal: "Torna esta mensagem mais formal e profissional",
        friendly: "Torna esta mensagem mais amigável e calorosa",
        rewrite: "Reescreve esta mensagem de forma diferente",
      };
      
      const messages = [
        { role: 'system', content: actionPrompts[action] },
        { role: 'user', content: draft.content }
      ];
      
      const result = await suggestReplies(messages);
      if (result?.suggestions?.[0]) {
        setDraft(prev => ({
          ...prev,
          content: result.suggestions[0].text,
          isAIDraft: true,
        }));
        toast.success("Mensagem modificada com AI");
      }
    } catch (error) {
      toast.error("Erro ao modificar mensagem");
    } finally {
      setIsGenerating(false);
    }
  }, [draft.content, suggestReplies]);

  // Map channel to template channel type
  const getTemplateChannel = useCallback((): TemplateChannel => {
    switch (selectedChannel) {
      case 'email': return 'email';
      case 'whatsapp': return 'whatsapp';
      default: return 'inbox';
    }
  }, [selectedChannel]);

  // Handle save as template
  const handleSaveAsTemplate = useCallback(() => {
    const prefilledTemplate: Partial<CommunicationTemplate> = {
      channel: getTemplateChannel(),
      subject: draft.subject || undefined,
      body: draft.content,
      language: 'pt',
      tone: 'professional',
      journeyContexts: ['followup'],
      isActive: true,
    };
    setTemplateToEdit(prefilledTemplate as CommunicationTemplate);
    setShowTemplateDialog(true);
  }, [draft, getTemplateChannel]);

  // Handle create new template
  const handleCreateTemplate = useCallback(() => {
    setTemplateToEdit(null);
    setShowTemplateDialog(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with channel selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Centro de Mensagens</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(channelConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = selectedChannel === key;
                return (
                  <Button
                    key={key}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn("gap-1.5", isActive && config.color)}
                    onClick={() => handleChannelChange(key as MessageChannel)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Compose Area */}
        <Card className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <CardHeader className="pb-3">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="compose" className="gap-1.5">
                  <Send className="h-4 w-4" />
                  Compor
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Sugestões AI
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Compose Tab */}
              <TabsContent value="compose" className="m-0 space-y-4">
                {/* Recipient info */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {entityName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{entityName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedChannel === 'email' && entityEmail}
                      {(selectedChannel === 'whatsapp' || selectedChannel === 'sms') && entityPhone}
                      {selectedChannel === 'instagram' && 'Via Instagram DM'}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("gap-1", currentChannelConfig.color)}>
                    <ChannelIcon className="h-3 w-3" />
                    {currentChannelConfig.label}
                  </Badge>
                </div>

                {/* Subject (email only) */}
                {selectedChannel === 'email' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Assunto
                    </label>
                    <Input
                      value={draft.subject || ''}
                      onChange={(e) => setDraft(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Assunto do email..."
                      className="h-9"
                    />
                  </div>
                )}

                {/* Message content */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Mensagem
                    </label>
                    {draft.isAIDraft && (
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        Gerada por AI
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    value={draft.content}
                    onChange={(e) => setDraft(prev => ({ ...prev, content: e.target.value, isAIDraft: false }))}
                    placeholder={`Escreva a sua mensagem para ${currentChannelConfig.label}...`}
                    className="min-h-[180px] resize-none"
                  />
                </div>

                {/* AI modification buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Modificar com AI:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModifyDraft('shorten')}
                    disabled={isGenerating || !draft.content}
                    className="h-7 text-xs gap-1"
                  >
                    <Scissors className="h-3 w-3" />
                    Encurtar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModifyDraft('formal')}
                    disabled={isGenerating || !draft.content}
                    className="h-7 text-xs gap-1"
                  >
                    <Briefcase className="h-3 w-3" />
                    Mais Formal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModifyDraft('friendly')}
                    disabled={isGenerating || !draft.content}
                    className="h-7 text-xs gap-1"
                  >
                    <Smile className="h-3 w-3" />
                    Mais Amigável
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModifyDraft('rewrite')}
                    disabled={isGenerating || !draft.content}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reescrever
                  </Button>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAsTemplate}
                    disabled={!draft.content.trim()}
                    className="h-7 text-xs gap-1"
                  >
                    <Save className="h-3 w-3" />
                    Guardar como Template
                  </Button>
                </div>

                <Separator />

                {/* Action buttons */}
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={!draft.content}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button onClick={handleSend} disabled={!draft.content || isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar via {currentChannelConfig.label}
                  </Button>
                </div>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="m-0 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex-1">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Escolha um template e personalize-o. As variáveis serão substituídas automaticamente.
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateTemplate}
                    size="sm"
                    className="gap-1.5 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Template
                  </Button>
                </div>

                <Input
                  placeholder="Pesquisar templates..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="h-9"
                />

                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum template encontrado</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {filteredTemplates.map((template) => {
                      const goalInfo = goalConfig[template.goal];
                      const GoalIcon = goalInfo.icon;
                      const isSelected = selectedTemplateId === template.id;
                      
                      return (
                        <div
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected 
                              ? "border-primary bg-primary/5 ring-1 ring-primary" 
                              : "border-border hover:border-primary/50 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{template.name}</span>
                            <Badge variant="outline" className={cn("text-[10px] py-0", goalInfo.color)}>
                              <GoalIcon className="w-2.5 h-2.5 mr-1" />
                              {goalInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.content.substring(0, 120)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px] py-0">
                              {template.type}
                            </Badge>
                            {template.usage_count > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                Usado {template.usage_count}x
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {templates.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAllTemplates(!showAllTemplates)}
                  >
                    {showAllTemplates ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Ver todos ({templates.length})
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>

              {/* AI Suggestions Tab */}
              <TabsContent value="ai" className="m-0 space-y-4">
                <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-primary">
                    A IA analisa o contexto e gera sugestões personalizadas para {entityName}. Forneça contexto adicional para melhores resultados.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Contexto adicional (opcional)
                  </label>
                  <Textarea
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    placeholder="Ex: Seguimento após reunião, proposta de serviços, agradecimento por compra..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <Button
                  onClick={handleGenerateAISuggestions}
                  disabled={isGenerating || aiLoading}
                  className="w-full gap-2"
                >
                  {isGenerating || aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Gerar Sugestões AI
                </Button>

                {aiSuggestions && aiSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Sugestões ({aiSuggestions.length})
                    </h4>
                    {aiSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          selectedSuggestion === suggestion.text
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => handleUseSuggestion(suggestion.text)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px]">
                            {suggestion.tone === "formal" && <Briefcase className="w-2.5 h-2.5 mr-1" />}
                            {suggestion.tone === "friendly" && <Smile className="w-2.5 h-2.5 mr-1" />}
                            {suggestion.tone === "formal" ? "Formal" :
                              suggestion.tone === "friendly" ? "Amigável" :
                              suggestion.tone === "empathetic" ? "Empático" : "Profissional"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground italic">
                            {suggestion.intent}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{suggestion.text}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-7 text-xs w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseSuggestion(suggestion.text);
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Usar esta sugestão
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Right Sidebar - Quick Actions & Tips */}
        <div className="space-y-4">
          {/* Quick send buttons */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {entityEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  asChild
                >
                  <a href={`mailto:${entityEmail}`}>
                    <Mail className="h-4 w-4" />
                    Enviar Email
                  </a>
                </Button>
              )}
              {entityPhone && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a href={`https://wa.me/${entityPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <Phone className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a href={`tel:${entityPhone}`}>
                      <Phone className="h-4 w-4" />
                      Ligar
                    </a>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Dicas AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Forneça contexto adicional para sugestões mais precisas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Use templates como base e personalize com AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>Modifique o tom da mensagem para cada situação</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 text-amber-500 flex-shrink-0" />
                  <span>Reveja sempre antes de enviar</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Recent Conversations - Real Data */}
          <LinkedConversationsCard entityType={entityType} entityId={entityId} />
        </div>
      </div>

      {/* Template Form Dialog */}
      <TemplateFormDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        template={templateToEdit}
        onClose={() => {
          setShowTemplateDialog(false);
          setTemplateToEdit(null);
        }}
      />

      {/* Compose Email Dialog */}
      {entityEmail && (
        <ComposeEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          recipient={{
            email: entityEmail,
            name: entityName,
            entityType,
            entityId,
          }}
          defaultSubject={draft.subject}
          defaultBody={draft.content}
          templateContext={{
            contact: { name: entityName, email: entityEmail, phone: entityPhone || undefined },
          }}
          onSent={() => {
            setDraft({ channel: 'email', subject: '', content: '', isAIDraft: false });
          }}
        />
      )}
    </div>
  );
}
