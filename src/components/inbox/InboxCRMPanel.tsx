import { useState } from "react";
import { useConversation } from "@/hooks/useConversations";
import { useLead, useUpdateLead } from "@/hooks/useLeads";
import { useOpportunities, useCreateOpportunity } from "@/hooks/useOpportunities";
import { useProposals } from "@/hooks/useProposals";
import { useTasks, useCreateTask } from "@/hooks/useTasks";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building2,
  Target,
  FileText,
  CheckCircle,
  Plus,
  ExternalLink,
  DollarSign,
  Calendar,
  ListTodo,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface InboxCRMPanelProps {
  conversationId: string | null;
}

export function InboxCRMPanel({ conversationId }: InboxCRMPanelProps) {
  const { data: conversation } = useConversation(conversationId || undefined);
  const { data: lead } = useLead(conversation?.lead_id || undefined);
  const { data: opportunities } = useOpportunities();
  const { data: proposals } = useProposals();
  const { data: tasks } = useTasks();
  const { data: stages } = usePipelineStages();
  const updateLead = useUpdateLead();
  const createOpportunity = useCreateOpportunity();
  const createTask = useCreateTask();
  
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityValue, setOpportunityValue] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  
  // Filter related data
  const leadOpportunities = opportunities?.filter(o => o.lead_id === lead?.id) || [];
  const leadProposals = proposals?.filter(p => 
    leadOpportunities.some(o => o.id === p.opportunity_id)
  ) || [];
  const leadTasks = tasks?.filter(t => 
    t.related_type === "lead" && t.related_id === lead?.id
  ) || [];
  
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
        stage_id: stages[0].id,
      });
      toast.success("Oportunidade criada");
      setShowOpportunityDialog(false);
      setOpportunityTitle("");
      setOpportunityValue("");
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
  
  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Selecione uma conversa para ver o contexto CRM
        </p>
      </div>
    );
  }
  
  if (!lead) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-4">
        <User className="w-10 h-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Sem lead associado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Esta conversa não tem um lead no CRM
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Criar Lead
        </Button>
      </div>
    );
  }
  
  const totalOpportunityValue = leadOpportunities.reduce((acc, o) => acc + (o.value || 0), 0);
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Lead Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Lead
              </CardTitle>
              <Link to={`/dashboard/leads/${lead.id}`}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{lead.name}</p>
              <Badge 
                variant="outline" 
                className={
                  lead.status === "new" ? "border-blue-500 text-blue-500" :
                  lead.status === "in_progress" ? "border-amber-500 text-amber-500" :
                  "border-green-500 text-green-500"
                }
              >
                {lead.status === "new" ? "Novo" : 
                 lead.status === "in_progress" ? "Em progresso" : "Concluído"}
              </Badge>
            </div>
            
            {lead.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" />
                {lead.email}
              </div>
            )}
            
            {lead.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                {lead.phone}
              </div>
            )}
            
            {lead.source && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-3 h-3" />
                Origem: {lead.source}
              </div>
            )}
            
            <Separator />
            
            {/* Quick Status Update */}
            <div>
              <Label className="text-xs">Atualizar Estado</Label>
              <Select value={lead.status} onValueChange={handleUpdateLeadStatus}>
                <SelectTrigger className="mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Qualificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Opportunities Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Oportunidades
              </CardTitle>
              <Dialog open={showOpportunityDialog} onOpenChange={setShowOpportunityDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Oportunidade</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input 
                        value={opportunityTitle}
                        onChange={(e) => setOpportunityTitle(e.target.value)}
                        placeholder="Ex: Projeto de website"
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
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateOpportunity} disabled={!opportunityTitle}>
                      Criar Oportunidade
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {leadOpportunities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem oportunidades</p>
            ) : (
              <div className="space-y-2">
                {leadOpportunities.map((opp) => {
                  const stage = stages?.find(s => s.id === opp.stage_id);
                  return (
                    <div key={opp.id} className="p-2 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{opp.title}</span>
                        <Badge 
                          variant="outline"
                          style={{ borderColor: stage?.color, color: stage?.color }}
                        >
                          {stage?.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        €{opp.value?.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">€{totalOpportunityValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Proposals Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Propostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadProposals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem propostas enviadas</p>
            ) : (
              <div className="space-y-2">
                {leadProposals.map((proposal) => (
                  <div key={proposal.id} className="p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{proposal.title}</span>
                      <Badge 
                        variant="outline"
                        className={
                          proposal.status === "accepted" ? "border-green-500 text-green-500" :
                          proposal.status === "published" ? "border-blue-500 text-blue-500" :
                          proposal.status === "expired" ? "border-amber-500 text-amber-500" :
                          "border-muted-foreground"
                        }
                      >
                        {proposal.status === "accepted" ? "Aceite" :
                         proposal.status === "published" ? "Enviada" :
                         proposal.status === "expired" ? "Expirada" : 
                         proposal.status === "draft" ? "Rascunho" : proposal.status}
                      </Badge>
                    </div>
                    {proposal.price && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        €{proposal.price.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tasks Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                Tarefas
              </CardTitle>
              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Tarefa</DialogTitle>
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
                      Criar Tarefa
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {leadTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem tarefas</p>
            ) : (
              <div className="space-y-2">
                {leadTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <CheckCircle className={`w-4 h-4 ${
                      task.status === "done" ? "text-green-500" : "text-muted-foreground"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${
                        task.status === "done" ? "line-through text-muted-foreground" : ""
                      }`}>
                        {task.title}
                      </p>
                      {task.due_at && (
                        <p className="text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {format(new Date(task.due_at), "dd/MM HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowOpportunityDialog(true)}>
              <Target className="w-4 h-4 mr-2" />
              Criar Oportunidade
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowTaskDialog(true)}>
              <ListTodo className="w-4 h-4 mr-2" />
              Criar Follow-up
            </Button>
            <Link to="/dashboard/proposals">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Enviar Proposta
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
