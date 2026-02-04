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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  User,
  Mail,
  Phone,
  Target,
  FileText,
  Plus,
  ExternalLink,
  DollarSign,
  Calendar,
  ListTodo,
  Activity,
  Tag,
  Globe,
  Send,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnifiedActivityLog } from "@/components/crm/UnifiedActivityLog";
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
          Selecione uma conversa para ver o contexto
        </p>
      </div>
    );
  }
  
  if (!lead && !contact) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-3">
        <User className="w-8 h-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Sem contacto</p>
          <p className="text-xs text-muted-foreground mt-1">
            Conversa sem contacto associado
          </p>
        </div>
      </div>
    );
  }
  
  const totalOpportunityValue = leadOpportunities.reduce((acc, o) => acc + (o.value || 0), 0);
  const displayName = lead?.name || contact?.name || "Desconhecido";
  const displayEmail = lead?.email || contact?.email;
  const displayPhone = lead?.phone || contact?.phone;
  const displayTags = lead?.tags || contact?.tags || [];
  const avatarUrl = (lead as any)?.avatar_url || (contact as any)?.avatar_url;
  const website = (company as any)?.website || (contact as any)?.website || null;
  
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const lastContactDate = conversation?.last_message_at 
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: pt })
    : "Nunca";
  
  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header - Always visible */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{displayName}</h3>
            {website && (
              <a 
                href={website.startsWith("http") ? website : `https://${website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <Globe className="w-3 h-3" />
                <span className="truncate">{website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {displayPhone && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={`tel:${displayPhone}`}>
                <Phone className="w-4 h-4" />
              </a>
            </Button>
          )}
          {displayEmail && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={`mailto:${displayEmail}`}>
                <Mail className="w-4 h-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Calendar className="w-4 h-4" />
          </Button>
          
          <div className="ml-auto">
            <Badge 
              variant="secondary"
              className={cn(
                "text-xs",
                conversation?.status === "open" 
                  ? "bg-green-500/10 text-green-600" 
                  : "bg-muted"
              )}
            >
              {conversation?.status === "open" ? "Ativo" : "Fechado"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 h-9 mx-4 mt-2" style={{ width: "calc(100% - 2rem)" }}>
          <TabsTrigger value="info" className="text-xs gap-1">
            <User className="w-3 h-3" />
            Info
          </TabsTrigger>
          <TabsTrigger value="sales" className="text-xs gap-1">
            <DollarSign className="w-3 h-3" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <Activity className="w-3 h-3" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Contact Details */}
              <div className="space-y-2">
                {displayEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{displayEmail}</span>
                  </div>
                )}
                {displayPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{displayPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Último contacto:</span>
                  <span>{lastContactDate}</span>
                </div>
              </div>

              {/* Tags */}
              {displayTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tag className="w-3 h-3" />
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {displayTags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to full profile */}
              {(lead || contact) && (
                <Link to={lead ? `/dashboard/leads/${lead.id}` : `/dashboard/contacts/${contact?.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    Ver Perfil Completo
                  </Button>
                </Link>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-semibold">{leadOpportunities.length}</p>
                  <p className="text-xs text-muted-foreground">Oportunidades</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-semibold">{leadProposals.length}</p>
                  <p className="text-xs text-muted-foreground">Propostas</p>
                </div>
              </div>

              {/* Total Value */}
              {totalOpportunityValue > 0 && (
                <div className="p-2 rounded-lg bg-green-500/10 text-center">
                  <p className="text-sm font-semibold text-green-600">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalOpportunityValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                </div>
              )}

              {/* Open Opportunities */}
              {openOpportunities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Em Aberto</h4>
                  {openOpportunities.slice(0, 3).map(opp => (
                    <div key={opp.id} className="p-2 rounded border bg-background flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{opp.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(opp.value || 0)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => handleSendProposal(opp.id)}
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Tasks */}
              {leadTasks.filter(t => t.status !== "done").length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Tarefas Pendentes</h4>
                  {leadTasks.filter(t => t.status !== "done").slice(0, 3).map(task => (
                    <div key={task.id} className="p-2 rounded border bg-background">
                      <p className="text-xs font-medium">{task.title}</p>
                      {task.due_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(task.due_at), "d MMM", { locale: pt })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Dialog open={showOpportunityDialog} onOpenChange={setShowOpportunityDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      + Oportunidade
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
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {stages?.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
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
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <ListTodo className="w-3 h-3 mr-1" />
                      + Tarefa
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
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {lead && (
                <UnifiedActivityLog
                  entityType="lead"
                  entityId={lead.id}
                  compact
                />
              )}
              {!lead && contact && (
                <UnifiedActivityLog
                  entityType="contact"
                  entityId={contact.id}
                  compact
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
