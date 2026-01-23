import { useState, useMemo } from "react";
import { Opportunity } from "@/types/opportunity";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  AlertTriangle,
  Lightbulb,
  Activity,
  FileText,
  User,
  DollarSign,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useOpportunityDetail, useUpdateOpportunityEnhanced, usePipelineStagesEnhanced } from "@/hooks/useOpportunitiesEnhanced";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";
import { OpportunityDetailsSection } from "./sections/OpportunityDetailsSection";
import { OpportunityAssociationsSection } from "./sections/OpportunityAssociationsSection";
import { OpportunityRecurrenceSection } from "./sections/OpportunityRecurrenceSection";

interface OpportunityDetailDialogProps {
  opportunity: Opportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAsWon: () => void;
  onMarkAsLost: () => void;
}

export function OpportunityDetailDialog({
  opportunity: initialOpp,
  open,
  onOpenChange,
  onMarkAsWon,
  onMarkAsLost,
}: OpportunityDetailDialogProps) {
  const { data: opportunity } = useOpportunityDetail(initialOpp.id);
  const updateOpportunity = useUpdateOpportunityEnhanced();
  const { data: stages = [] } = usePipelineStagesEnhanced();
  const { data: leads = [], isLoading: isLoadingLeads } = useLeads();
  const { contacts, isLoading: isLoadingContacts } = useContacts();
  const { companies, isLoading: isLoadingCompanies } = useCompanies();
  const [notes, setNotes] = useState(initialOpp.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const opp = opportunity || initialOpp;

  const handleOpportunityUpdate = async (updates: { id: string } & Record<string, unknown>) => {
    await updateOpportunity.mutateAsync(updates);
  };

  const leadOptions = useMemo(() => 
    leads.map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone })),
    [leads]
  );

  const contactOptions = useMemo(() => 
    contacts.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company })),
    [contacts]
  );

  const companyOptions = useMemo(() => 
    companies.map(c => ({ id: c.id, name: c.name, website: c.website })),
    [companies]
  );

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Ganho</Badge>;
      case "lost":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Perdido</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Aberto</Badge>;
    }
  };

  const getTemperatureInfo = (temp: string | null) => {
    switch (temp) {
      case "hot":
        return { label: "Quente", color: "text-red-600", bg: "bg-red-50" };
      case "warm":
        return { label: "Morno", color: "text-amber-600", bg: "bg-amber-50" };
      case "cold":
        return { label: "Frio", color: "text-blue-600", bg: "bg-blue-50" };
      default:
        return null;
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await updateOpportunity.mutateAsync({
        id: opp.id,
        notes,
      });
      toast.success("Notas guardadas");
    } catch (error) {
      toast.error("Erro ao guardar notas");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const temperatureInfo = getTemperatureInfo(opp.ai_temperature);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{opp.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(opp.status)}
                {opp.stage && (
                  <Badge variant="outline" className="gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: opp.stage.color }}
                    />
                    {opp.stage.name}
                  </Badge>
                )}
                {temperatureInfo && (
                  <Badge variant="outline" className={cn(temperatureInfo.color, temperatureInfo.bg)}>
                    {temperatureInfo.label}
                  </Badge>
                )}
              </div>
            </div>
            {opp.status === "open" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-green-600" onClick={onMarkAsWon}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Ganho
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={onMarkAsLost}>
                  <XCircle className="w-4 h-4 mr-1" />
                  Perdido
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="recurrence">
              <DollarSign className="w-4 h-4 mr-1" />
              Recorrência
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="w-4 h-4 mr-1" />
              IA
            </TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="space-y-4 m-0">
              {/* Inline Editable Details */}
              <OpportunityDetailsSection
                opportunity={opp}
                stages={stages}
                onUpdate={handleOpportunityUpdate}
              />

              {/* Associations */}
              <OpportunityAssociationsSection
                opportunity={opp}
                leads={leadOptions}
                contacts={contactOptions}
                companies={companyOptions}
                onUpdate={handleOpportunityUpdate}
                isLoadingLeads={isLoadingLeads}
                isLoadingContacts={isLoadingContacts}
                isLoadingCompanies={isLoadingCompanies}
              />

              {/* Additional Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Criada em:</span>
                      <span className="ml-2 font-medium">
                        {format(new Date(opp.created_at), "d MMM yyyy", { locale: pt })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Última atividade:</span>
                      <span className="ml-2 font-medium">
                        {opp.last_activity_at
                          ? format(new Date(opp.last_activity_at), "d MMM yyyy HH:mm", { locale: pt })
                          : "-"}
                      </span>
                    </div>
                    {opp.status === "lost" && opp.lost_reason && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Motivo da perda:</span>
                        <span className="ml-2 font-medium text-red-600">{opp.lost_reason}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recurrence" className="space-y-4 m-0">
              <OpportunityRecurrenceSection
                opportunity={opp}
                onUpdate={handleOpportunityUpdate}
              />
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 m-0">
              {/* AI Insights */}
              {opp.ai_insight ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Insights IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{opp.ai_insight}</p>
                    {opp.ai_analyzed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Analisado em {format(new Date(opp.ai_analyzed_at), "d MMM yyyy HH:mm", { locale: pt })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Sem insights IA disponíveis</p>
                    <p className="text-xs mt-1">Os insights serão gerados automaticamente</p>
                  </CardContent>
                </Card>
              )}

              {/* AI Next Action */}
              {opp.ai_next_action && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Próxima Ação Sugerida
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{opp.ai_next_action}</p>
                  </CardContent>
                </Card>
              )}

              {/* Temperature Analysis */}
              {temperatureInfo && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Temperatura do Negócio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className={cn("p-3 rounded-lg", temperatureInfo.bg)}>
                        <span className={cn("text-lg font-bold", temperatureInfo.color)}>
                          {temperatureInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {opp.ai_temperature === "hot" && "Esta oportunidade mostra sinais fortes de fecho iminente."}
                        {opp.ai_temperature === "warm" && "Esta oportunidade está ativa mas precisa de acompanhamento."}
                        {opp.ai_temperature === "cold" && "Esta oportunidade pode precisar de reativação ou está em risco."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Indicators */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Indicadores de Risco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {!opp.expected_close_date && (
                      <li className="flex items-center gap-2 text-amber-600">
                        <Calendar className="w-4 h-4" />
                        Sem data de fecho prevista
                      </li>
                    )}
                    {!opp.contact && !opp.lead && (
                      <li className="flex items-center gap-2 text-amber-600">
                        <User className="w-4 h-4" />
                        Sem contacto associado
                      </li>
                    )}
                    {Number(opp.value) === 0 && (
                      <li className="flex items-center gap-2 text-amber-600">
                        <DollarSign className="w-4 h-4" />
                        Sem valor definido
                      </li>
                    )}
                    {opp.expected_close_date && new Date(opp.expected_close_date) < new Date() && opp.status === "open" && (
                      <li className="flex items-center gap-2 text-red-600">
                        <Clock className="w-4 h-4" />
                        Data de fecho ultrapassada
                      </li>
                    )}
                    {opp.contact && opp.lead && !opp.expected_close_date === false && Number(opp.value) > 0 && (
                      <li className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Sem riscos identificados
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="m-0">
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Timeline de atividades</p>
                  <p className="text-xs mt-1">Em breve disponível</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 m-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione notas sobre esta oportunidade..."
                    className="min-h-[200px]"
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                    >
                      {isSavingNotes ? "A guardar..." : "Guardar Notas"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
