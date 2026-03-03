import { useParams, useNavigate } from "react-router-dom";
import { useRenewalContract, useRenewalItems, useUpdateRenewalContract } from "@/hooks/useRenewals";
import { useRenewalEvents } from "@/hooks/useRenewalEvents";
import { useRenewalUsage } from "@/hooks/useRenewalUsage";
import {
  RENEWAL_STATUS_CONFIG, RENEWAL_INTERVAL_LABELS, RENEWAL_BILLING_LABELS,
  RENEWAL_ITEM_TYPE_LABELS, RENEWAL_ITEM_STATUS_CONFIG, PRICING_MODEL_LABELS,
  getHealthScoreColor, getHealthScoreBg, RENEWAL_EVENT_LABELS,
} from "@/types/renewal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pause, XCircle, RefreshCw, Plus, Clock, Calendar, CreditCard, Activity, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useState } from "react";
import { LogUsageDialog } from "@/components/renewals/LogUsageDialog";
import { CreateRenewalItemDialog } from "@/components/renewals/CreateRenewalItemDialog";
import { RenewalAISuggestions } from "@/components/renewals/RenewalAISuggestions";
import { toast } from "sonner";

export default function RenewalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contract, isLoading } = useRenewalContract(id);
  const { data: items = [] } = useRenewalItems(id);
  const { data: events = [] } = useRenewalEvents(id);
  const { data: usage = [] } = useRenewalUsage(id);
  const updateContract = useUpdateRenewalContract();
  const [showLogUsage, setShowLogUsage] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contrato não encontrado</p>
        <Button variant="link" onClick={() => navigate("/dashboard/renewals")}>Voltar</Button>
      </div>
    );
  }

  const statusConfig = RENEWAL_STATUS_CONFIG[contract.status];

  const handleStatusChange = (newStatus: "paused" | "cancelled" | "active") => {
    updateContract.mutate({ id: contract.id, status: newStatus } as any);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/renewals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{contract.company?.name || "Contrato"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {RENEWAL_INTERVAL_LABELS[contract.renewal_interval]}
              </Badge>
              {contract.auto_renew && (
                <Badge variant="outline" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Auto-renew</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contract.status === "active" && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("paused")}>
                <Pause className="mr-1 h-3.5 w-3.5" /> Pausar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleStatusChange("cancelled")}>
                <XCircle className="mr-1 h-3.5 w-3.5" /> Cancelar
              </Button>
            </>
          )}
          {contract.status === "paused" && (
            <Button size="sm" onClick={() => handleStatusChange("active")}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retomar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumo</TabsTrigger>
          <TabsTrigger value="items">Itens ({items.length})</TabsTrigger>
          <TabsTrigger value="usage">Consumo ({usage.length})</TabsTrigger>
          <TabsTrigger value="billing">Faturação</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({events.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Health Score</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`text-3xl font-bold ${getHealthScoreColor(contract.health_score)}`}>
                    {contract.health_score}
                  </div>
                  <Progress value={contract.health_score} className="flex-1 h-3" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">MRR</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(Number(contract.total_mrr || 0))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Próxima Renovação</CardTitle></CardHeader>
              <CardContent>
                <p className="text-lg font-medium">
                  {contract.next_renewal_date
                    ? format(new Date(contract.next_renewal_date), "dd MMM yyyy", { locale: pt })
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhes</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Empresa</span><span className="font-medium">{contract.company?.name || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contacto</span><span>{contract.contact?.name || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Billing</span><span>{RENEWAL_BILLING_LABELS[contract.billing_type]}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span>{format(new Date(contract.start_date), "dd/MM/yyyy")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Moeda</span><span>{contract.currency}</span></div>
                  {contract.payment_terms_days && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Prazo Pagamento</span><span>{contract.payment_terms_days} dias</span></div>
                  )}
                </CardContent>
              </Card>
              {contract.notes && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Notas</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p></CardContent>
                </Card>
              )}
            </div>
            <RenewalAISuggestions
              contractId={contract.id}
              riskLevel={(contract as any).risk_level}
              reasonsJson={(contract as any).reasons_json}
              healthScore={contract.health_score}
            />
          </div>
        </TabsContent>

        {/* Items */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Item
            </Button>
          </div>
          {items.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum item adicionado</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead>Renovação</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const itemStatus = RENEWAL_ITEM_STATUS_CONFIG[item.status];
                      const meta = (item.meta_json || {}) as Record<string, unknown>;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.item_type === "hours_pack" && meta.hours_remaining !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  {Number(meta.hours_remaining).toFixed(1)}h restantes de {Number(meta.hours_included || 0)}h
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{RENEWAL_ITEM_TYPE_LABELS[item.item_type]}</Badge></TableCell>
                          <TableCell className="text-xs">{PRICING_MODEL_LABELS[item.pricing_model]}</TableCell>
                          <TableCell className="text-right">{Number(item.qty)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                          <TableCell>
                            {item.next_renewal_date
                              ? format(new Date(item.next_renewal_date), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell><span className={`text-xs font-medium ${itemStatus.color}`}>{itemStatus.label}</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage */}
        <TabsContent value="usage" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowLogUsage(true)}>
              <Clock className="mr-1 h-3.5 w-3.5" /> Registar Consumo
            </Button>
          </div>
          {usage.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum consumo registado</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fonte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-sm">{format(new Date(u.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{u.usage_type}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{Number(u.amount)} {u.unit}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.description || "—"}</TableCell>
                        <TableCell className="text-xs">{u.source_type || "manual"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Módulo de faturação integrada em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          {events.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Sem eventos</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="relative flex gap-3 pl-1">
                        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {RENEWAL_EVENT_LABELS[event.event_type] || event.event_type}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: pt })}
                            </span>
                          </div>
                          {event.payload_json && Object.keys(event.payload_json).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(event.payload_json)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {showLogUsage && id && (
        <LogUsageDialog
          contractId={id}
          items={items}
          open={showLogUsage}
          onOpenChange={setShowLogUsage}
        />
      )}

      {showAddItem && id && (
        <CreateRenewalItemDialog
          contractId={id}
          open={showAddItem}
          onOpenChange={setShowAddItem}
        />
      )}
    </div>
  );
}
