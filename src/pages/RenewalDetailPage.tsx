import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRenewalContract, useRenewalItems, useUpdateRenewalContract, useConfirmRenewal } from "@/hooks/useRenewals";
import { useRenewalDiscounts } from "@/hooks/useRenewalDiscounts";
import { useRenewalEvents } from "@/hooks/useRenewalEvents";
import { useRenewalUsage } from "@/hooks/useRenewalUsage";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  RENEWAL_STATUS_CONFIG, RENEWAL_INTERVAL_LABELS, RENEWAL_BILLING_LABELS,
  RENEWAL_ITEM_TYPE_LABELS, RENEWAL_ITEM_STATUS_CONFIG, PRICING_MODEL_LABELS,
  getHealthScoreColor, RENEWAL_EVENT_LABELS, calculateRealMRR,
  getIntervalSuffix, getEffectiveIntervalMonths,
} from "@/types/renewal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Pause, XCircle, RefreshCw, Plus, Clock, CreditCard, Activity,
  Mail, CheckCircle2, Pencil, TrendingUp, CalendarClock, BarChart3, DollarSign,
  ShieldCheck, AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays, differenceInMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { useState, useMemo } from "react";
import { LogUsageDialog } from "@/components/renewals/LogUsageDialog";
import { CreateRenewalItemDialog } from "@/components/renewals/CreateRenewalItemDialog";
import { RenewalAISuggestions } from "@/components/renewals/RenewalAISuggestions";
import { RenewalPaymentDialog } from "@/components/renewals/RenewalPaymentDialog";
import { RenewalAlertSettings } from "@/components/renewals/RenewalAlertSettings";
import { RenewalBillingTab } from "@/components/renewals/RenewalBillingTab";
import { EditRenewalContractDialog } from "@/components/renewals/EditRenewalContractDialog";
import { ComposeEmailDialog } from "@/components/email";
import { RenewalDiscountsSection } from "@/components/renewals/RenewalDiscountsSection";

export default function RenewalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: contract, isLoading } = useRenewalContract(id);
  const { data: items = [] } = useRenewalItems(id);
  const { data: events = [] } = useRenewalEvents(id);
  const { data: discounts = [] } = useRenewalDiscounts(id);
  const { data: usage = [] } = useRenewalUsage(id);
  const updateContract = useUpdateRenewalContract();
  const confirmRenewal = useConfirmRenewal();
  const [showLogUsage, setShowLogUsage] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);

  const formatCurrency = (val: number, cur?: string) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: cur || "EUR" }).format(val);

  // --- Advanced KPIs ---
  const kpis = useMemo(() => {
    if (!contract) return null;

    // Valor base dos itens ativos
    const itemsBaseValue = items
      .filter(i => i.status === 'active' || i.status === 'pending_renewal')
      .reduce((s, i) => s + Number(i.unit_price) * Number(i.qty), 0);

    // Fallback: se total_mrr for 0, usar itens
    const storedValue = Number(contract.total_mrr || 0);
    const contractValue = storedValue > 0 ? storedValue : itemsBaseValue;

    // Calcular descontos ativos para mostrar valor base vs efetivo
    const today = new Date().toISOString().split("T")[0];
    const activeDiscounts = discounts.filter(d => {
      if (!d.is_active) return false;
      if (d.start_date > today) return false;
      if (d.end_date && d.end_date < today) return false;
      if (d.max_cycles && d.cycles_used >= d.max_cycles) return false;
      return true;
    });

    const totalPctDiscount = activeDiscounts
      .filter(d => d.discount_type === 'percentage')
      .reduce((s, d) => s + Number(d.discount_value), 0);
    const totalFixedDiscount = activeDiscounts
      .filter(d => d.discount_type === 'fixed_amount')
      .reduce((s, d) => s + Number(d.discount_value), 0);

    const hasActiveDiscounts = activeDiscounts.length > 0;
    const baseValue = itemsBaseValue;
    // contractValue from DB already includes discounts via trigger

    const mrr = calculateRealMRR(contractValue, contract.renewal_interval, contract.start_date, contract.next_renewal_date);
    const arr = mrr * 12;

    // Contract lifetime in months
    const lifetimeMonths = differenceInMonths(new Date(), new Date(contract.start_date));

    // LTV: projeção mínima de 1 ciclo contratual quando contrato ainda não iniciou
    const effectiveMonths = getEffectiveIntervalMonths(contract.renewal_interval, contract.start_date, contract.next_renewal_date);
    const isProjected = lifetimeMonths < 1;
    const ltv = isProjected ? contractValue : mrr * lifetimeMonths;

    // Days until next renewal
    const daysUntilRenewal = contract.next_renewal_date
      ? differenceInDays(new Date(contract.next_renewal_date), new Date())
      : null;

    // Renewal events count
    const renewalCount = events.filter((e) => e.event_type === "renewed" || e.event_type === "payment_received").length;

    // Payment events for average payment time
    const paymentEvents = events.filter((e) => e.event_type === "payment_received");
    const invoiceEvents = events.filter((e) => e.event_type === "invoice_sent");

    // Total items value
    const totalItemsValue = items.reduce((s, i) => s + Number(i.unit_price) * Number(i.qty), 0);

    // Active items ratio
    const activeItems = items.filter((i) => i.status === "active").length;

    // Overdue items
    const overdueItems = items.filter((i) => i.status === "overdue").length;

    // Usage total
    const totalUsage = usage.reduce((s, u) => s + Number(u.amount), 0);

    return {
      mrr, arr, lifetimeMonths, ltv, daysUntilRenewal, isProjected,
      contractValue, baseValue, hasActiveDiscounts,
      renewalCount, totalItemsValue, activeItems, overdueItems,
      totalUsage, paymentEvents: paymentEvents.length, invoiceEvents: invoiceEvents.length,
    };
  }, [contract, events, items, usage, discounts]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!contract) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contrato não encontrado</p>
          <Button variant="link" onClick={() => navigate("/dashboard/renewals")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = RENEWAL_STATUS_CONFIG[contract.status];

  const handleStatusChange = (newStatus: "paused" | "cancelled" | "active") => {
    updateContract.mutate({ id: contract.id, status: newStatus } as any);
  };

  const contactEmail = (contract as any).contact?.email || "";
  const contactName = (contract as any).contact?.name || "";
  const companyName = contract.company?.name || "";
  const renewalDateStr = contract.next_renewal_date
    ? format(new Date(contract.next_renewal_date), "dd/MM/yyyy")
    : "";

  const openEmailWithPaymentLink = (url: string) => {
    setPendingPaymentUrl(url);
    setShowEmailDialog(true);
  };

  const defaultEmailBody = pendingPaymentUrl
    ? `Caro(a) ${contactName || "Cliente"},\n\nSegue o link para proceder ao pagamento da renovação dos seus serviços:\n\n${pendingPaymentUrl}\n\nPara qualquer questão, não hesite em contactar-nos.\n\nCom os melhores cumprimentos.`
    : "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/renewals")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{companyName || "Contrato"}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {RENEWAL_INTERVAL_LABELS[contract.renewal_interval]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {RENEWAL_BILLING_LABELS[contract.billing_type]}
                </Badge>
                {contract.auto_renew && (
                  <Badge variant="outline" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Auto-renew</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPaymentDialog(true)}>
              <CreditCard className="mr-1 h-3.5 w-3.5" /> Link Pagamento
            </Button>
            {contract.status === "active" && (
              <Button
                size="sm"
                variant="default"
                disabled={confirmRenewal.isPending}
                onClick={() => confirmRenewal.mutate(contract.id)}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {confirmRenewal.isPending ? "A confirmar..." : "Confirmar Renovação"}
              </Button>
            )}
            {contactEmail && (
              <Button variant="outline" size="sm" onClick={() => { setPendingPaymentUrl(null); setShowEmailDialog(true); }}>
                <Mail className="mr-1 h-3.5 w-3.5" /> Email
              </Button>
            )}
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

          {/* Overview with enhanced KPIs */}
          <TabsContent value="overview" className="space-y-4">
            {/* Row 1: Core financial KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">MRR</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(kpis?.mrr || 0, contract.currency)}</p>
                  {contract.renewal_interval !== 'monthly' && (
                    <p className="text-[10px] text-muted-foreground">
                      Valor {RENEWAL_INTERVAL_LABELS[contract.renewal_interval]}: {formatCurrency(kpis?.contractValue || 0, contract.currency)}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">ARR</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(kpis?.arr || 0, contract.currency)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">
                      {kpis?.isProjected ? "LTV Projetado" : "LTV Estimado"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(kpis?.ltv || 0, contract.currency)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {kpis?.isProjected ? "projeção 1 ciclo" : `${kpis?.lifetimeMonths || 0} meses de contrato`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Health Score</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${getHealthScoreColor(contract.health_score)}`}>
                      {contract.health_score}
                    </span>
                    <Progress value={contract.health_score} className="flex-1 h-2.5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Operational KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="py-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Próxima Renovação</p>
                  {kpis?.daysUntilRenewal !== null && kpis?.daysUntilRenewal !== undefined ? (
                    <>
                      <p className="text-lg font-bold mt-0.5">
                        {contract.next_renewal_date
                          ? format(new Date(contract.next_renewal_date), "dd MMM yyyy", { locale: pt })
                          : "—"}
                      </p>
                      <p className={`text-xs font-medium ${kpis.daysUntilRenewal <= 7 ? "text-red-600" : kpis.daysUntilRenewal <= 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {kpis.daysUntilRenewal < 0
                          ? `${Math.abs(kpis.daysUntilRenewal)} dias em atraso`
                          : kpis.daysUntilRenewal === 0
                            ? "Hoje"
                            : `Em ${kpis.daysUntilRenewal} dias`}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-bold mt-0.5">—</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Renovações</p>
                  <p className="text-lg font-bold mt-0.5">{kpis?.renewalCount || 0}</p>
                  <p className="text-xs text-muted-foreground">confirmadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Itens Ativos</p>
                  <p className="text-lg font-bold mt-0.5">
                    {kpis?.activeItems || 0}
                    <span className="text-muted-foreground font-normal text-sm">/{items.length}</span>
                  </p>
                  {(kpis?.overdueItems || 0) > 0 && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {kpis?.overdueItems} em atraso
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Valor dos Itens</p>
                  <p className="text-lg font-bold mt-0.5">{formatCurrency(kpis?.totalItemsValue || 0, contract.currency)}</p>
                  <p className="text-xs text-muted-foreground">recorrente</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Consumo Total</p>
                  <p className="text-lg font-bold mt-0.5">{kpis?.totalUsage || 0}</p>
                  <p className="text-xs text-muted-foreground">{usage.length} registos</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Detalhes do Contrato</CardTitle>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowEditDialog(true)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Empresa</span><span className="font-medium">{companyName || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Contacto</span><span>{contactName || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Billing</span><span>{RENEWAL_BILLING_LABELS[contract.billing_type]}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Periodicidade</span><span>{RENEWAL_INTERVAL_LABELS[contract.renewal_interval]}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span>{format(new Date(contract.start_date), "dd/MM/yyyy")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Moeda</span><span>{contract.currency}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Auto-renew</span><span>{contract.auto_renew ? "Sim" : "Não"}</span></div>
                    {contract.payment_terms_days && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Prazo Pagamento</span><span>{contract.payment_terms_days} dias</span></div>
                    )}
                    {contract.dunning_attempts > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Dunning</span><span className="text-red-600 font-medium">{contract.dunning_attempts} tentativas</span></div>
                    )}
                  </CardContent>
                </Card>
                {contract.notes && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Notas</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p></CardContent>
                  </Card>
                )}
                <RenewalAlertSettings
                  contractId={contract.id}
                  alertSettings={(contract as any).alert_settings || null}
                />
              </div>
              <RenewalAISuggestions
                contractId={contract.id}
                riskLevel={(contract as any).risk_level}
                reasonsJson={(contract as any).reasons_json}
                healthScore={contract.health_score}
                onAction={(action) => {
                  const actionMessages: Record<string, string> = {
                    schedule_meeting: "Funcionalidade de agendar reunião em breve",
                    send_proposal: "Funcionalidade de envio de proposta em breve",
                    create_task: "Funcionalidade de criar tarefa em breve",
                    adjust_pricing: "Funcionalidade de ajuste de preço em breve",
                    contact_client: "Funcionalidade de contacto em breve",
                  };
                  toast.info(actionMessages[action] || `Ação: ${action}`);
                }}
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
                            <TableCell className="text-right">{formatCurrency(Number(item.unit_price), contract.currency)}</TableCell>
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
            <RenewalBillingTab
              contractId={contract.id}
              workspaceId={currentWorkspace?.id || ""}
              onGeneratePaymentLink={() => setShowPaymentDialog(true)}
              stripeSubscriptionId={contract.stripe_subscription_id}
              dunningAttempts={(contract as any).dunning_attempts || 0}
              contractStatus={contract.status}
            />
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

        {/* Dialogs */}
        {showLogUsage && id && (
          <LogUsageDialog contractId={id} items={items} open={showLogUsage} onOpenChange={setShowLogUsage} />
        )}
        {showAddItem && id && (
          <CreateRenewalItemDialog contractId={id} open={showAddItem} onOpenChange={setShowAddItem} />
        )}
        {showPaymentDialog && (
          <RenewalPaymentDialog
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            contract={contract}
            items={items}
            onPaymentCreated={(url) => openEmailWithPaymentLink(url)}
          />
        )}
        {showEditDialog && (
          <EditRenewalContractDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            contract={contract}
          />
        )}
        {showEmailDialog && contactEmail && (
          <ComposeEmailDialog
            open={showEmailDialog}
            onOpenChange={setShowEmailDialog}
            recipient={{
              email: contactEmail,
              name: contactName,
              entityType: "contact",
              entityId: contract.contact_id || "",
            }}
            defaultSubject={`Renovação — ${companyName} — ${renewalDateStr}`}
            defaultBody={defaultEmailBody}
            onSent={() => setPendingPaymentUrl(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
