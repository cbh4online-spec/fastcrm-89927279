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
  Bell,
  Settings,
  Flag,
  Ban,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  
  // Get avatar and website
  const avatarUrl = (lead as any)?.avatar_url || (contact as any)?.avatar_url;
  const website = (company as any)?.website || (contact as any)?.website || null;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Format last contact date
  const lastContactDate = conversation?.last_message_at 
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: pt })
    : "Nunca";

  // Calculate subscribed date (using lead created_at as proxy)
  const subscribedDate = lead?.created_at 
    ? format(new Date(lead.created_at), "d MMM yyyy", { locale: pt })
    : contact?.created_at
    ? format(new Date(contact.created_at), "d MMM yyyy", { locale: pt })
    : null;

  const isActive = conversation?.status === "open";
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header with large avatar */}
        <div className="text-center space-y-3">
          <Avatar className="h-16 w-16 mx-auto">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-base">{displayName}</h3>
            {website && (
              <a 
                href={website.startsWith("http") ? website : `https://${website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center justify-center gap-1 hover:underline"
              >
                <Globe className="w-3 h-3" />
                {website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-2">
          {displayPhone && (
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" asChild>
              <a href={`tel:${displayPhone}`}>
                <Phone className="w-4 h-4" />
              </a>
            </Button>
          )}
          {displayEmail && (
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" asChild>
              <a href={`mailto:${displayEmail}`}>
                <Mail className="w-4 h-4" />
              </a>
            </Button>
          )}
          <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
            <Calendar className="w-4 h-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-green-500 text-white hover:bg-green-600 text-xs px-3"
          >
            Unsubscribe
          </Button>
        </div>

        <Separator />

        {/* Stats Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge className={cn(
              "text-xs",
              isActive 
                ? "bg-green-500 hover:bg-green-500 text-white" 
                : "bg-muted text-muted-foreground"
            )}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Oportunidades:</span>
            <span className="font-medium">{leadOpportunities.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Último Contacto:</span>
            <span className="font-medium text-xs">{lastContactDate}</span>
          </div>
          {subscribedDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subscrito:</span>
              <span className="font-medium text-xs">{subscribedDate}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Notifications Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </h4>
          <div className="space-y-2">
            {openOpportunities.length > 0 && (
              <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span>{openOpportunities.length} Oportunidade(s) em Aberto</span>
                <span className="ml-auto text-xs text-muted-foreground">Agora</span>
              </div>
            )}
            {conversation?.unread_count > 0 && (
              <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>{conversation.unread_count} Mensagem(ns) Nova(s)</span>
                <span className="ml-auto text-xs text-muted-foreground">Agora</span>
              </div>
            )}
            {leadTasks.filter(t => t.status !== "done").length > 0 && (
              <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <ListTodo className="w-4 h-4 text-purple-500" />
                <span>{leadTasks.filter(t => t.status !== "done").length} Tarefa(s) Pendente(s)</span>
                <span className="ml-auto text-xs text-muted-foreground">12h</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* User Settings Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Definições
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4 text-muted-foreground" />
                Notificações
              </span>
              <Switch defaultChecked />
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8">
              <Flag className="w-4 h-4 mr-2 text-muted-foreground" />
              Reportar
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-8 text-destructive hover:text-destructive">
              <Ban className="w-4 h-4 mr-2" />
              Bloquear
            </Button>
          </div>
        </div>

        <Separator />

        {/* Quick Actions Bar - Compact */}
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
        </div>

        {/* Link to full profile */}
        {(lead || contact) && (
          <div className="pt-2">
            <Link to={lead ? `/dashboard/leads/${lead.id}` : `/dashboard/contacts/${contact?.id}`}>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                <ExternalLink className="w-3 h-3 mr-1.5" />
                Ver Perfil Completo
              </Button>
            </Link>
          </div>
        )}
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
