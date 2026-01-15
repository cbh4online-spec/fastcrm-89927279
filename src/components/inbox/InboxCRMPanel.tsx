import { useState, useMemo } from "react";
import { useConversation } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useLead, useUpdateLead } from "@/hooks/useLeads";
import { useOpportunities, useCreateOpportunity } from "@/hooks/useOpportunities";
import { useProposals } from "@/hooks/useProposals";
import { useTasks, useCreateTask } from "@/hooks/useTasks";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useContact } from "@/hooks/useContacts";
import { useCompany } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Mail,
  Phone,
  Building2,
  Target,
  FileText,
  CheckCircle,
  Plus,
  ExternalLink,
  DollarSign,
  Calendar,
  ListTodo,
  Activity,
  Thermometer,
  Tag,
  Globe,
  Briefcase,
  TrendingUp,
  Clock,
  Eye,
  Send,
  Star,
  Users,
} from "lucide-react";
import { UnifiedActivityLog } from "@/components/crm/UnifiedActivityLog";
import { ConversationTemperature } from "./ConversationTemperature";
import { CreateProposalDialog } from "@/components/proposals/CreateProposalDialog";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { calculateTemperature } from "@/lib/conversationTemperature";

interface InboxCRMPanelProps {
  conversationId: string | null;
}

// Calculate lead score based on various factors
function calculateLeadScore(
  lead: any,
  opportunities: any[],
  proposals: any[],
  conversationTemp: number
): number {
  let score = 0;
  
  // Base score from lead status
  if (lead?.status === "completed") score += 30;
  else if (lead?.status === "in_progress") score += 20;
  else score += 10;
  
  // Opportunities value contribution
  const totalValue = opportunities.reduce((acc, o) => acc + (o.value || 0), 0);
  if (totalValue > 10000) score += 25;
  else if (totalValue > 5000) score += 20;
  else if (totalValue > 1000) score += 15;
  else if (totalValue > 0) score += 10;
  
  // Proposals engagement
  const hasAcceptedProposal = proposals.some(p => p.status === "accepted");
  const hasViewedProposal = proposals.some(p => (p.views_count || 0) > 0);
  if (hasAcceptedProposal) score += 25;
  else if (hasViewedProposal) score += 15;
  else if (proposals.length > 0) score += 5;
  
  // Conversation temperature contribution
  score += Math.round(conversationTemp * 0.2);
  
  return Math.min(100, score);
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-500";
  if (score >= 40) return "text-amber-500";
  return "text-muted-foreground";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-muted-foreground";
}

export function InboxCRMPanel({ conversationId }: InboxCRMPanelProps) {
  const { data: conversation } = useConversation(conversationId || undefined);
  const { data: messages } = useMessages(conversationId || undefined);
  const { data: lead } = useLead(conversation?.lead_id || undefined);
  const { data: contact } = useContact(conversation?.contact_id || undefined);
  const { data: company } = useCompany(conversation?.company_id || undefined);
  const { data: opportunities } = useOpportunities();
  const { data: proposals } = useProposals();
  const { data: tasks } = useTasks();
  const { data: stages } = usePipelineStages();
  const updateLead = useUpdateLead();
  const createOpportunity = useCreateOpportunity();
  const createTask = useCreateTask();
  
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [selectedOpportunityForProposal, setSelectedOpportunityForProposal] = useState<string | null>(null);
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityValue, setOpportunityValue] = useState("");
  const [opportunityStage, setOpportunityStage] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  
  // Filter related data
  const leadOpportunities = useMemo(() => 
    opportunities?.filter(o => o.lead_id === lead?.id) || []
  , [opportunities, lead?.id]);
  
  const leadProposals = useMemo(() => 
    proposals?.filter(p => 
      leadOpportunities.some(o => o.id === p.opportunity_id)
    ) || []
  , [proposals, leadOpportunities]);
  
  const leadTasks = useMemo(() => 
    tasks?.filter(t => 
      t.related_type === "lead" && t.related_id === lead?.id
    ) || []
  , [tasks, lead?.id]);

  const openOpportunities = useMemo(() => 
    leadOpportunities.filter(o => o.status === "open")
  , [leadOpportunities]);

  // Calculate temperature and score
  const conversationTemp = useMemo(() => {
    if (!conversation || !messages) return 0;
    return calculateTemperature({
      ...conversation,
      messages: messages || [],
      opportunities: openOpportunities.map(o => ({ id: o.id, status: o.status, value: o.value })),
    }).score;
  }, [conversation, messages, openOpportunities]);

  const leadScore = useMemo(() => 
    calculateLeadScore(lead, leadOpportunities, leadProposals, conversationTemp)
  , [lead, leadOpportunities, leadProposals, conversationTemp]);
  
  const handleUpdateLeadStatus = async (status: string) => {
    if (!lead) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, status: status as any });
      toast.success("Estado do lead atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar estado");
    }
  };
  
  const handleCreateOpportunity = async () => {
    if (!lead || !opportunityTitle || !stages?.[0]) return;
    try {
      await createOpportunity.mutateAsync({
        title: opportunityTitle,
        lead_id: lead.id,
        value: parseFloat(opportunityValue) || 0,
        stage_id: opportunityStage || stages[0].id,
      });
      toast.success("Oportunidade criada");
      setShowOpportunityDialog(false);
      setOpportunityTitle("");
      setOpportunityValue("");
      setOpportunityStage("");
    } catch (error) {
      toast.error("Erro ao criar oportunidade");
    }
  };
  
  const handleCreateTask = async () => {
    if (!lead || !taskTitle) return;
    try {
      await createTask.mutateAsync({
        title: taskTitle,
        related_type: "lead",
        related_id: lead.id,
        due_at: taskDueDate || undefined,
      });
      toast.success("Tarefa criada");
      setShowTaskDialog(false);
      setTaskTitle("");
      setTaskDueDate("");
    } catch (error) {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleSendProposal = (opportunityId: string) => {
    setSelectedOpportunityForProposal(opportunityId);
    setShowProposalDialog(true);
  };
  
  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Selecione uma conversa para ver o contexto CRM
        </p>
      </div>
    );
  }
  
  if (!lead && !contact) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-4">
        <User className="w-10 h-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Sem contacto associado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Esta conversa não tem um contacto no CRM
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Criar Contacto
        </Button>
      </div>
    );
  }
  
  const totalOpportunityValue = leadOpportunities.reduce((acc, o) => acc + (o.value || 0), 0);
  const displayName = lead?.name || contact?.name || "Desconhecido";
  const displayEmail = lead?.email || contact?.email;
  const displayPhone = lead?.phone || contact?.phone;
  const displayTags = lead?.tags || contact?.tags || [];
  
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Quick Actions Bar */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-primary">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={showOpportunityDialog} onOpenChange={setShowOpportunityDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs justify-start">
                    <Target className="w-3 h-3 mr-1.5" />
                    Nova Oportunidade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Criar Oportunidade
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input 
                        value={opportunityTitle}
                        onChange={(e) => setOpportunityTitle(e.target.value)}
                        placeholder={`Oportunidade - ${displayName}`}
                      />
                    </div>
                    <div>
                      <Label>Valor (€)</Label>
                      <Input 
                        type="number"
                        value={opportunityValue}
                        onChange={(e) => setOpportunityValue(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Etapa</Label>
                      <Select value={opportunityStage} onValueChange={setOpportunityStage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar etapa..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stages?.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateOpportunity} disabled={!opportunityTitle}>
                      Criar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Select value={lead?.status || ""} onValueChange={handleUpdateLeadStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" />
                    <span className="truncate">Estado</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Qualificado</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs justify-start">
                    <ListTodo className="w-3 h-3 mr-1.5" />
                    Nova Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ListTodo className="w-5 h-5" />
                      Criar Tarefa
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input 
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Ex: Fazer follow-up"
                      />
                    </div>
                    <div>
                      <Label>Data Limite</Label>
                      <Input 
                        type="datetime-local"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateTask} disabled={!taskTitle}>
                      Criar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {openOpportunities.length > 0 ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs justify-start"
                  onClick={() => handleSendProposal(openOpportunities[0].id)}
                >
                  <FileText className="w-3 h-3 mr-1.5" />
                  Enviar Proposta
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs justify-start" disabled>
                        <FileText className="w-3 h-3 mr-1.5" />
                        Enviar Proposta
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Crie uma oportunidade primeiro</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact/Lead Card with Score */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {lead ? "Lead" : "Contacto"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Star className={cn("w-3.5 h-3.5", getScoreColor(leadScore))} />
                        <span className={cn("text-xs font-medium", getScoreColor(leadScore))}>
                          {leadScore}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Score do Lead</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Link to={lead ? `/dashboard/leads/${lead.id}` : `/dashboard/contacts/${contact?.id}`}>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{displayName}</p>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  lead?.status === "new" ? "border-blue-500 text-blue-500" :
                  lead?.status === "in_progress" ? "border-amber-500 text-amber-500" :
                  "border-green-500 text-green-500"
                )}
              >
                {lead?.status === "new" ? "Novo" : 
                 lead?.status === "in_progress" ? "Em progresso" : "Qualificado"}
              </Badge>
            </div>

            {/* Score Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Score</span>
                <span className={getScoreColor(leadScore)}>{leadScore}/100</span>
              </div>
              <Progress value={leadScore} className="h-1.5" />
            </div>
            
            {displayEmail && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{displayEmail}</span>
              </div>
            )}
            
            {displayPhone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3 h-3 shrink-0" />
                {displayPhone}
              </div>
            )}
            
            {lead?.source && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="w-3 h-3 shrink-0" />
                Origem: {lead.source}
              </div>
            )}

            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <Tag className="w-3 h-3 text-muted-foreground" />
                {displayTags.slice(0, 4).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
                {displayTags.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{displayTags.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Card */}
        {company && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Empresa
                </CardTitle>
                <Link to={`/dashboard/companies/${company.id}`}>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <p className="font-medium text-sm">{company.name}</p>
              
              {company.industry && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  {company.industry}
                </div>
              )}
              
              {company.size && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-3 h-3 shrink-0" />
                  {company.size}
                </div>
              )}
              
              {company.website && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3 shrink-0" />
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {company.tags && company.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  {company.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Temperature Card */}
        {conversation && messages && messages.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5" />
                Temperatura
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <ConversationTemperature 
                conversation={{
                  ...conversation,
                  messages: messages || [],
                  opportunities: openOpportunities.map(o => ({
                    id: o.id,
                    status: o.status,
                    value: o.value,
                  })),
                }}
                variant="full"
                showDetails
              />
            </CardContent>
          </Card>
        )}
        
        {/* Open Opportunities Card */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Oportunidades ({openOpportunities.length})
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => setShowOpportunityDialog(true)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {openOpportunities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem oportunidades abertas</p>
            ) : (
              <div className="space-y-2">
                {openOpportunities.slice(0, 3).map((opp) => {
                  const stage = stages?.find(s => s.id === opp.stage_id);
                  const oppProposals = leadProposals.filter(p => p.opportunity_id === opp.id);
                  return (
                    <div key={opp.id} className="p-2 bg-muted/50 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{opp.title}</span>
                        <Badge 
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 shrink-0"
                          style={{ borderColor: stage?.color, color: stage?.color }}
                        >
                          {stage?.name}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          €{opp.value?.toLocaleString() || 0}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => handleSendProposal(opp.id)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Proposta
                        </Button>
                      </div>
                      {oppProposals.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          {oppProposals.length} proposta(s)
                        </div>
                      )}
                    </div>
                  );
                })}
                {totalOpportunityValue > 0 && (
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total pipeline:</span>
                    <span className="font-medium">€{totalOpportunityValue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Proposals Card */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Propostas ({leadProposals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {leadProposals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem propostas enviadas</p>
            ) : (
              <div className="space-y-2">
                {leadProposals.slice(0, 3).map((proposal) => (
                  <div key={proposal.id} className="p-2 bg-muted/50 rounded-lg space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{proposal.title}</span>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 shrink-0",
                          proposal.status === "accepted" ? "border-green-500 text-green-500" :
                          proposal.status === "published" ? "border-blue-500 text-blue-500" :
                          proposal.status === "expired" ? "border-amber-500 text-amber-500" :
                          "border-muted-foreground"
                        )}
                      >
                        {proposal.status === "accepted" ? "Aceite" :
                         proposal.status === "published" ? "Enviada" :
                         proposal.status === "expired" ? "Expirada" : 
                         proposal.status === "draft" ? "Rascunho" : proposal.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {proposal.price && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          €{proposal.price.toLocaleString()}
                        </div>
                      )}
                      {(proposal.views_count || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {proposal.views_count} visualizações
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Tasks */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5" />
                Tarefas ({leadTasks.length})
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => setShowTaskDialog(true)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {leadTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem tarefas</p>
            ) : (
              <div className="space-y-1.5">
                {leadTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-start gap-2 p-1.5 rounded">
                    <CheckCircle className={cn(
                      "w-3.5 h-3.5 mt-0.5 shrink-0",
                      task.status === "done" ? "text-green-500" : "text-muted-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs truncate",
                        task.status === "done" && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      {task.due_at && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDistanceToNow(new Date(task.due_at), { addSuffix: true, locale: pt })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <UnifiedActivityLog
              leadId={lead?.id}
              conversationId={conversationId || undefined}
              compact
              limit={5}
            />
          </CardContent>
        </Card>
      </div>

      {/* Create Proposal Dialog */}
      {selectedOpportunityForProposal && (
        <CreateProposalDialog
          open={showProposalDialog}
          onOpenChange={(open) => {
            setShowProposalDialog(open);
            if (!open) setSelectedOpportunityForProposal(null);
          }}
          opportunityId={selectedOpportunityForProposal}
        />
      )}
    </ScrollArea>
  );
}
