import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Mail,
  Phone,
  Search,
  Star,
  StarOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wand2,
  Copy,
  Target,
  MessageCircle,
  Calendar,
  Lightbulb,
} from "lucide-react";
import { useTemplates, Template, TemplateGoal, TemplateType } from "@/hooks/useTemplates";
import { useInboxAI, LeadData, OpportunityData } from "@/hooks/useInboxAI";
import { Message } from "@/hooks/useMessages";
import { 
  VariableContext, 
  validateTemplate, 
  renderTemplate, 
  extractVariables 
} from "@/lib/templateVariables";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InboxTemplatePanelProps {
  channel: string;
  messages: Message[];
  templateContext: VariableContext;
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  onApply: (content: string, subject?: string) => void;
  trigger?: React.ReactNode;
}

const channelConfig: Record<string, { icon: React.ElementType; label: string; templateType: TemplateType }> = {
  email: { icon: Mail, label: "Email", templateType: "email" },
  whatsapp: { icon: Phone, label: "WhatsApp", templateType: "whatsapp" },
  instagram: { icon: MessageCircle, label: "Instagram", templateType: "instagram_dm" },
  sms: { icon: MessageCircle, label: "SMS", templateType: "sms" },
};

const goalConfig: Record<TemplateGoal, { icon: React.ElementType; label: string; color: string }> = {
  qualification: { icon: Target, label: "Qualificação", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  follow_up: { icon: MessageCircle, label: "Follow-up", color: "bg-green-500/10 text-green-700 border-green-500/30" },
  booking: { icon: Calendar, label: "Agendamento", color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  closing: { icon: CheckCircle2, label: "Fecho", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  support: { icon: Lightbulb, label: "Suporte", color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30" },
  other: { icon: FileText, label: "Outro", color: "bg-gray-500/10 text-gray-700 border-gray-500/30" },
};

export function InboxTemplatePanel({
  channel,
  messages,
  templateContext,
  leadData,
  opportunityData,
  onApply,
  trigger,
}: InboxTemplatePanelProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [isAdapting, setIsAdapting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const { data: templates, isLoading: templatesLoading } = useTemplates({ isActive: true });
  const { personalizeTemplate, isLoading: aiLoading } = useInboxAI();

  // Get channel config
  const currentChannel = channelConfig[channel] || channelConfig.email;

  // Filter templates by channel
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    
    let filtered = templates.filter(t => {
      // Filter by channel/type
      if (t.type !== currentChannel.templateType && t.type !== "email") {
        return false;
      }
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query) ||
          (t.subject?.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // Sort: favorites first, then by usage
    filtered.sort((a, b) => {
      const aFav = favoriteIds.has(a.id) ? 1 : 0;
      const bFav = favoriteIds.has(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return (b.usage_count || 0) - (a.usage_count || 0);
    });

    return filtered;
  }, [templates, currentChannel.templateType, searchQuery, favoriteIds]);

  // Get favorites
  const favoriteTemplates = useMemo(() => 
    filteredTemplates.filter(t => favoriteIds.has(t.id)),
  [filteredTemplates, favoriteIds]);

  // Validate selected template
  const validation = useMemo(() => {
    if (!selectedTemplate) return null;
    return validateTemplate(selectedTemplate.content, templateContext);
  }, [selectedTemplate, templateContext]);

  // Handle template selection
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    
    // Render template with CRM data
    const rendered = renderTemplate(template.content, templateContext);
    const renderedSubject = template.subject 
      ? renderTemplate(template.subject, templateContext)
      : "";
    
    setEditedContent(rendered);
    setEditedSubject(renderedSubject);
  };

  // AI adapt template to conversation
  const handleAIAdapt = async () => {
    if (!selectedTemplate) return;
    
    setIsAdapting(true);
    try {
      const result = await personalizeTemplate(
        selectedTemplate,
        messages,
        leadData,
        opportunityData,
        channel
      );
      
      if (result?.personalizedText) {
        setEditedContent(result.personalizedText);
        if (result.subject) {
          setEditedSubject(result.subject);
        }
        toast.success("Template adaptado pela AI");
      }
    } catch (error) {
      console.error("AI adaptation error:", error);
      toast.error("Erro ao adaptar template");
    } finally {
      setIsAdapting(false);
    }
  };

  // Apply template
  const handleApply = () => {
    if (!editedContent.trim()) {
      toast.error("O conteúdo não pode estar vazio");
      return;
    }
    
    // Check for unresolved variables
    const unresolvedVars = extractVariables(editedContent);
    if (unresolvedVars.length > 0) {
      toast.warning(`Atenção: ${unresolvedVars.length} variável(is) não resolvida(s)`);
    }
    
    onApply(editedContent, editedSubject || undefined);
    setOpen(false);
    setSelectedTemplate(null);
    setEditedContent("");
    setEditedSubject("");
    toast.success("Template inserido");
  };

  // Copy template
  const handleCopy = () => {
    const fullContent = editedSubject 
      ? `Assunto: ${editedSubject}\n\n${editedContent}`
      : editedContent;
    navigator.clipboard.writeText(fullContent);
    toast.success("Copiado!");
  };

  // Toggle favorite
  const toggleFavorite = (templateId: string) => {
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // Render template card
  const renderTemplateCard = (template: Template) => {
    const goalInfo = goalConfig[template.goal];
    const GoalIcon = goalInfo.icon;
    const isFavorite = favoriteIds.has(template.id);
    const isSelected = selectedTemplate?.id === template.id;
    const variables = extractVariables(template.content);

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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{template.name}</span>
              <Badge variant="outline" className={cn("text-[10px] py-0", goalInfo.color)}>
                <GoalIcon className="w-2.5 h-2.5 mr-1" />
                {goalInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {template.content.substring(0, 100)}...
            </p>
            {variables.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Badge variant="secondary" className="text-[10px] py-0">
                  {variables.length} variável(is)
                </Badge>
              </div>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(template.id);
                  }}
                >
                  {isFavorite ? (
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ) : (
                    <StarOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <FileText className="w-3 h-3" />
            Templates
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <currentChannel.icon className="w-5 h-5 text-primary" />
            <SheetTitle>Templates de {currentChannel.label}</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Escolha um template e deixe a AI adaptá-lo à conversa
          </p>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Template List */}
          <div className="w-1/2 border-r flex flex-col">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-3 mt-2 h-8 w-auto justify-start">
                <TabsTrigger value="all" className="text-xs h-7">
                  Todos ({filteredTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="favorites" className="text-xs h-7">
                  <Star className="w-3 h-3 mr-1" />
                  Favoritos ({favoriteTemplates.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-3">
                <TabsContent value="all" className="m-0 space-y-2">
                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum template encontrado
                    </div>
                  ) : (
                    filteredTemplates.map(renderTemplateCard)
                  )}
                </TabsContent>

                <TabsContent value="favorites" className="m-0 space-y-2">
                  {favoriteTemplates.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <StarOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      Nenhum favorito
                    </div>
                  ) : (
                    favoriteTemplates.map(renderTemplateCard)
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Template Editor */}
          <div className="w-1/2 flex flex-col">
            {selectedTemplate ? (
              <>
                {/* Template Info */}
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm truncate">{selectedTemplate.name}</h4>
                    <Badge variant="outline" className="text-[10px]">
                      {goalConfig[selectedTemplate.goal].label}
                    </Badge>
                  </div>

                  {/* Validation Status */}
                  {validation && (
                    <div className="space-y-1">
                      {validation.unresolvedVariables.length > 0 ? (
                        <Alert className="py-1.5 px-2">
                          <AlertCircle className="h-3 w-3" />
                          <AlertDescription className="text-[10px] ml-1">
                            {validation.unresolvedVariables.length} variável(is) sem dados. 
                            A AI pode completar.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="flex items-center gap-1.5 text-green-600 text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Todas variáveis preenchidas</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Adapt Button */}
                <div className="p-3 border-b bg-muted/20">
                  <Button
                    onClick={handleAIAdapt}
                    disabled={isAdapting || aiLoading}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {isAdapting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    Adaptar com AI à conversa
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    A AI personaliza o template com base no contexto da conversa
                  </p>
                </div>

                {/* Editor */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {/* Subject (for email) */}
                    {channel === "email" && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Assunto
                        </label>
                        <Input
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          placeholder="Assunto do email..."
                          className="text-sm"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Mensagem
                      </label>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        placeholder="Conteúdo da mensagem..."
                        className="min-h-[200px] text-sm resize-none"
                      />
                    </div>

                    {/* Unresolved Variables Warning */}
                    {extractVariables(editedContent).length > 0 && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {extractVariables(editedContent).length} variável(is) não substituída(s).
                          Edite manualmente ou use "Adaptar com AI".
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </ScrollArea>

                {/* Actions */}
                <div className="p-3 border-t flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    className="flex-1 gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Inserir na mensagem
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Selecione um template da lista
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
