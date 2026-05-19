import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, AlertTriangle, FlaskConical, Wrench, XCircle, Circle, Search, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sprint1Tab } from "@/components/admin/Sprint1Tab";
import { GHLRoutingTab } from "@/components/admin/GHLRoutingTab";
import { GHLRoutingAuditPanel } from "@/components/admin/GHLRoutingAuditPanel";

type Status =
  | "Functional" | "Partial" | "Mock/Demo" | "Structure Only" | "Broken" | "Not Implemented";
type Priority = "P0" | "P1" | "P2" | "P3";

interface ModuleAudit {
  key: string;
  module: string;
  status: Status;
  routes: string[];
  tables: string[];
  components: string[];
  edgeFunctions: string[];
  lastError: string;
  priority: Priority;
  nextStep: string;
}

const MODULES: ModuleAudit[] = [
  { key: "auth", module: "Authentication / Workspaces", status: "Functional",
    routes: ["/auth", "/onboarding", "/dashboard/profile"],
    tables: ["profiles", "workspaces", "workspace_members", "user_roles"],
    components: ["AuthProvider", "WorkspaceProvider", "LoginForm", "SignupForm"],
    edgeFunctions: ["create-workspace-member", "auth-email-hook"], lastError: "",
    priority: "P3", nextStep: "Manter; validar reset password e leaked password check." },
  { key: "dashboard-core", module: "Dashboard Core", status: "Functional",
    routes: ["/dashboard", "/messages"],
    tables: ["activity_logs"], components: ["DashboardLayout", "Sidebar", "TopBar"],
    edgeFunctions: [], lastError: "", priority: "P3", nextStep: "OK." },
  { key: "contacts", module: "Contacts", status: "Functional",
    routes: ["/dashboard/contacts"], tables: ["contacts", "contact_relationships"],
    components: ["AttioContactsTable"],
    edgeFunctions: ["contact-enrich", "detect-lead-duplicates"], lastError: "",
    priority: "P3", nextStep: "OK." },
  { key: "inbox", module: "Inbox / Communication Center", status: "Functional",
    routes: ["/dashboard/inbox", "/dashboard/inbox?channel=whatsapp", "/dashboard/communication/templates"],
    tables: ["communication_channels", "communication_conversations_unified", "communication_channel_logs", "conversations"],
    components: ["InboxView", "ConversationSidebar"],
    edgeFunctions: ["auto-route-conversation", "ai-inbox-reply"], lastError: "",
    priority: "P2", nextStep: "Validar contagem unread em conversas reais." },
  { key: "wa-pro", module: "WhatsApp Pro", status: "Functional",
    routes: ["/dashboard/whatsapp-pro", "/dashboard/whatsapp/ops"],
    tables: ["whatsapp_provider_instances", "whatsapp_messages", "whatsapp_communication_events"],
    components: ["WhatsAppPro", "WhatsAppOpsDashboard"],
    edgeFunctions: ["whatsapp-zapi-connect", "whatsapp-zapi-disconnect", "whatsapp-zapi-test-send"], lastError: "",
    priority: "P2", nextStep: "Confirmar QR + envio real em conta Z-API ativa." },
  { key: "wa-provider", module: "WhatsApp ZAPI/Zapy Provider", status: "Functional",
    routes: [], tables: ["whatsapp_provider_instances"],
    components: ["zapiAdapter", "zapyAdapter", "providerAdapter"],
    edgeFunctions: ["whatsapp-pro-send", "whatsapp-zapi-status"], lastError: "",
    priority: "P3", nextStep: "OK." },
  { key: "wa-webhooks", module: "WhatsApp Webhooks", status: "Partial",
    routes: [], tables: ["whatsapp_webhook_logs"],
    components: ["normalizeIncomingMessage", "normalizeMessageStatus"],
    edgeFunctions: ["whatsapp-zapi-webhook", "whatsapp-zapi-configure-webhook"],
    lastError: "Validação HMAC inconsistente entre fornecedores.",
    priority: "P1", nextStep: "Padronizar HMAC + replay protection no _shared/security.ts." },
  { key: "wa-products", module: "Product Sharing via WhatsApp", status: "Functional",
    routes: ["/dashboard/whatsapp-pro"], tables: ["products", "whatsapp_messages"],
    components: ["ShareProductDialog"], edgeFunctions: ["resolve-product-price"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "wa-templates", module: "WhatsApp Templates", status: "Functional",
    routes: ["/dashboard/communication/templates"],
    tables: ["communication_templates", "communication_template_variants"],
    components: ["CommunicationTemplates"], edgeFunctions: ["generate-template", "ai-template-copilot"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "wa-appointments", module: "WhatsApp Appointments", status: "Functional",
    routes: ["/dashboard/inbox"], tables: ["appointments"],
    components: ["AppointmentDialog"], edgeFunctions: ["communication-create-appointment", "public-booking"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "wa-followups", module: "WhatsApp Follow-ups", status: "Functional",
    routes: ["/dashboard/inbox"], tables: ["conversation_followups"],
    components: ["FollowupDialog"], edgeFunctions: ["auto-followup-scheduler"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "team-perf", module: "Team Performance", status: "Functional",
    routes: ["/dashboard/communication/executive", "/dashboard/kpis"],
    tables: ["conversation_quality_reviews", "conversation_scores"],
    components: ["ExecutiveCommandDashboard"], edgeFunctions: ["compute-metrics", "agent-coaching-insights-generate"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "support", module: "Support / Tickets", status: "Functional",
    routes: ["/dashboard/helpdesk", "/dashboard/tickets"],
    tables: ["support_tickets", "support_ticket_messages", "support_ticket_history", "support_categories"],
    components: ["TicketList", "TicketDetail"],
    edgeFunctions: ["communication-analyze-service-quality"], lastError: "",
    priority: "P2", nextStep: "Validar SLAs e atribuição automática." },
  { key: "voicehub", module: "VoiceHub", status: "Partial",
    routes: ["/dashboard/voicehub"],
    tables: ["voice_call_logs", "voice_call_intelligence", "voice_agent_status", "voice_business_hours"],
    components: ["VoiceHubPage"], edgeFunctions: ["voice-log-call", "generate-livekit-token"],
    lastError: "Integração SIP/3CX não validada end-to-end.",
    priority: "P1", nextStep: "Smoke test com nVoip ou 3CX em staging." },
  { key: "voice-provider", module: "Voice Provider Adapter", status: "Structure Only",
    routes: [], tables: [],
    components: ["nvoipAdapter", "sipAdapter", "threecxAdapter", "mockVoiceAdapter"],
    edgeFunctions: ["voice-test-provider"], lastError: "Sem credenciais configuradas.",
    priority: "P2", nextStep: "Pedir credenciais ao cliente e correr smoke test." },
  { key: "voice-c2c", module: "Voice Click-to-Call", status: "Partial",
    routes: ["/dashboard/voicehub"], tables: ["voice_call_logs"],
    components: ["ClickToCallButton"], edgeFunctions: ["voice-click-to-call"],
    lastError: "Função existe; depende do provider estar configurado.",
    priority: "P2", nextStep: "Validar com provider real." },
  { key: "voice-webhooks", module: "Voice Webhooks", status: "Partial",
    routes: [], tables: ["voice_call_logs"],
    components: [], edgeFunctions: ["voice-provider-webhook", "voice-route-inbound-call", "voice-assign-queue-call", "voice-ivr-event", "voice-sync-call-status"],
    lastError: "Sem tráfego real recebido.",
    priority: "P2", nextStep: "Configurar URL no provider." },
  { key: "voice-recording", module: "Voice Recording", status: "Structure Only",
    routes: [], tables: ["voice_call_logs"],
    components: [], edgeFunctions: ["voice-recording-upload", "voice-fetch-recording"],
    lastError: "Desligada por defeito por compliance.",
    priority: "P3", nextStep: "Manter desligada; ativar opt-in por workspace." },
  { key: "voice-transcription", module: "Voice Transcription", status: "Partial",
    routes: [], tables: ["voice_call_intelligence"],
    components: [], edgeFunctions: ["voice-transcribe-call"],
    lastError: "Depende de Whisper externo.",
    priority: "P2", nextStep: "Ligar ao webhook do provider." },
  { key: "voice-intel", module: "Voice Intelligence", status: "Partial",
    routes: ["/dashboard/voicehub"], tables: ["voice_call_intelligence", "voice_call_insights"],
    components: ["CallInsights"], edgeFunctions: ["voice-analyze-call"],
    lastError: "", priority: "P2", nextStep: "Disponível assim que transcrição correr." },
  { key: "voice-callcenter", module: "Call Center / Queues / IVR", status: "Structure Only",
    routes: ["/dashboard/voicehub"], tables: ["voice_agent_status", "voice_business_hours"],
    components: ["VoiceHubPage tabs ops"],
    edgeFunctions: ["voice-assign-queue-call", "voice-missed-call-recovery", "voice-complete-callback", "voice-ivr-event"],
    lastError: "Sem fila real; UI parcial.",
    priority: "P3", nextStep: "Adiar até SIP estável." },
  { key: "proposal-portal", module: "Public Proposal Portal", status: "Partial",
    routes: ["/portal/proposal/:token"], tables: ["proposals", "customer_portal_sessions"],
    components: ["ProposalPortalPage"], edgeFunctions: ["portal-load-proposal"],
    lastError: "Falta validar token expirado e payload sanitizado.",
    priority: "P2", nextStep: "Smoke test com token válido + inválido." },
  { key: "proposal-accept", module: "Proposal Acceptance", status: "Partial",
    routes: ["/portal/proposal/:token"], tables: ["proposals", "kernel_events"],
    components: ["ProposalPortalPage"], edgeFunctions: ["portal-accept-proposal", "project-from-won-proposal"],
    lastError: "", priority: "P2", nextStep: "Validar criação automática de projeto após accept." },
  { key: "onboarding-portal", module: "Public Onboarding Portal", status: "Partial",
    routes: ["/portal/onboarding/:token"],
    tables: ["customer_onboarding_projects", "customer_portal_sessions"],
    components: ["OnboardingPortalPage"], edgeFunctions: ["portal-load-onboarding"],
    lastError: "", priority: "P2", nextStep: "Validar token + isolamento de dados internos." },
  { key: "onboarding-checklist", module: "Onboarding Checklist", status: "Functional",
    routes: ["/portal/onboarding/:token", "/dashboard/onboarding/:id"],
    tables: ["customer_onboarding_checklist_items", "customer_onboarding_documents"],
    components: ["OnboardingChecklist"], edgeFunctions: ["portal-submit-checklist"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "delivery", module: "Delivery / Implementation", status: "Functional",
    routes: ["/dashboard/delivery/projects", "/dashboard/delivery/projects/:id"],
    tables: ["implementation_projects", "implementation_project_phases", "implementation_project_tasks", "implementation_blockers", "implementation_handovers"],
    components: ["DeliveryProjectsPage", "DeliveryProjectDetailPage"],
    edgeFunctions: ["implementation-create-from-onboarding", "implementation-analyze-project-risk", "implementation-generate-handover-summary"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "cost-guard", module: "Cost Guard", status: "Functional",
    routes: ["/dashboard/cost-guard", "/dashboard/communication/cost-guard"],
    tables: ["cost_guard_events", "cost_guard_daily", "cost_guard_monthly", "cost_guard_limits", "cost_guard_alerts", "cost_guard_rates", "cost_guard_plans"],
    components: ["CostGuardPage"], edgeFunctions: ["cost-guard-record", "cost-guard-summary"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "plan-mgmt", module: "Plan Management", status: "Functional",
    routes: ["/admin/plan-management", "/dashboard/settings/plan", "/dashboard/settings/workspace-plan", "/admin/billing-plans", "/dashboard/plans"],
    tables: ["billing_plans", "workspace_subscriptions"],
    components: ["PlanManagementPage", "MyPlanPage", "WorkspacePlanPage"],
    edgeFunctions: ["billing-sync-plan-to-stripe", "check-subscription"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "exec-dash", module: "Executive Dashboard", status: "Functional",
    routes: ["/dashboard/communication/executive", "/dashboard/executive-command"],
    tables: ["revenue_metrics", "kernel_decisions"],
    components: ["ExecutiveCommandDashboard"],
    edgeFunctions: ["executive-generate-summary", "ai-weekly-strategy"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "cs", module: "Customer Success", status: "Functional",
    routes: ["/dashboard/customer-success", "/dashboard/customer-success/:id"],
    tables: ["customer_accounts", "customer_health_score_snapshots", "customer_churn_risks", "customer_expansion_opportunities", "customer_qbr_reviews", "customer_success_playbooks", "customer_success_tasks"],
    components: ["CustomerSuccessPage", "CustomerAccountDetailPage"],
    edgeFunctions: ["customer-success-generate-health-score", "customer-success-generate-summary", "customer-success-generate-qbr"],
    lastError: "", priority: "P3", nextStep: "OK." },
  { key: "kernel", module: "Kernel / Event System", status: "Functional",
    routes: ["/admin/kernel"],
    tables: ["kernel_events", "kernel_entities", "kernel_event_registry", "kernel_entity_registry", "kernel_decisions", "kernel_decision_rules", "kernel_context_nodes", "kernel_context_edges", "kernel_change_events", "kernel_change_impacts", "kernel_audit_logs", "kernel_entity_timeline"],
    components: ["KernelAdminPage", "KernelEntityTimeline"],
    edgeFunctions: ["kernel-emit-event", "kernel-process-event", "kernel-replay-events", "kernel-diagnostics"],
    lastError: "", priority: "P2", nextStep: "Validar bridges legacy em produção." },
];

const STATUS_OPTIONS: Status[] = ["Functional", "Partial", "Mock/Demo", "Structure Only", "Broken", "Not Implemented"];

const STATUS_META: Record<Status, { icon: typeof CheckCircle2; className: string }> = {
  "Functional":      { icon: CheckCircle2,  className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  "Partial":         { icon: AlertTriangle, className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  "Mock/Demo":       { icon: FlaskConical,  className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  "Structure Only":  { icon: Wrench,        className: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  "Broken":          { icon: XCircle,       className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  "Not Implemented": { icon: Circle,        className: "bg-muted text-muted-foreground border-border" },
};

const PRIORITY_META: Record<Priority, string> = {
  P0: "bg-rose-600 text-white",
  P1: "bg-orange-500 text-white",
  P2: "bg-amber-400 text-amber-950",
  P3: "bg-muted text-muted-foreground",
};

const ROUTES_TO_TEST = [
  "/dashboard", "/messages",
  "/dashboard/inbox", "/dashboard/inbox?channel=whatsapp",
  "/dashboard/whatsapp-pro", "/dashboard/whatsapp/ops",
  "/dashboard/voicehub", "/dashboard/helpdesk",
  "/dashboard/tickets", "/dashboard/contacts",
  "/dashboard/communication/templates", "/dashboard/communication/executive",
  "/dashboard/cost-guard", "/dashboard/smart-workflows",
  "/dashboard/onboarding", "/dashboard/delivery/projects",
  "/dashboard/customer-success", "/admin/kernel",
  "/admin/product-audit", "/admin/plan-management",
  "/portal/proposal/:token", "/portal/onboarding/:token",
  "/dashboard/settings/integrations",
];

const WHATSAPP_CHECKLIST = [
  "Página /dashboard/whatsapp-pro abre sem erro",
  "Provider Z-API/Zapy aparece configurável",
  "QR / configuração acessível",
  "Envio de mensagem retorna resposta clara (sucesso ou erro)",
  "Webhook inbound regista mensagem em whatsapp_messages",
  "Logs aparecem em whatsapp_communication_events",
  "Envio de produto via ShareProductDialog funciona",
  "Templates listados a partir de communication_templates",
  "Agendamentos podem ser criados via inbox",
  "Follow-ups podem ser criados via inbox",
  "Painel Team Performance abre",
  "Tokens NUNCA aparecem no frontend (verificado)",
];

const VOICE_CHECKLIST = [
  "Página /dashboard/voicehub abre",
  "Registar chamada manual (voice-log-call)",
  "Associar chamada a contacto",
  "Simular click-to-call (voice-click-to-call)",
  "Receber webhook mock (voice-provider-webhook)",
  "Criar chamada perdida + callback",
  "Ver chamada na timeline do contacto",
  "Testar transcrição (voice-transcribe-call)",
  "Testar análise IA (voice-analyze-call)",
  "Confirmar gravação OFF por defeito",
  "Confirmar avisos de compliance ativos",
];

const PROPOSAL_CHECKLIST = [
  "Proposta pública abre por token (/portal/proposal/:token)",
  "Token inválido mostra erro amigável",
  "Aceitar proposta grava em proposals + kernel_events",
  "Pedir alteração funciona",
  "Rejeitar funciona",
  "Não expõe dados internos (workspace, custos, margens)",
];

const ONBOARDING_CHECKLIST = [
  "/portal/onboarding/:token abre",
  "Mostra progresso e checklist",
  "Permite submeter resposta (portal-submit-checklist)",
  "Lista documentos",
  "Não expõe dados internos do workspace",
  "Backend grava em customer_onboarding_*",
];

const DEMO_FLOWS = [
  { name: "A. WhatsApp Comercial", steps: ["Criar contacto", "Abrir conversa", "Enviar mensagem", "Enviar produto", "Criar follow-up", "Registar evento na timeline"], status: "Demonstrável" },
  { name: "B. Suporte", steps: ["Criar ticket a partir de conversa", "Atribuir agente", "Responder", "Marcar resolvido", "Histórico"], status: "Demonstrável" },
  { name: "C. Voz", steps: ["Registar chamada manual", "Associar contacto", "Criar callback", "Ver na timeline"], status: "Demonstrável (manual)" },
  { name: "D. Proposta/Onboarding", steps: ["Gerar link público de proposta", "Aceitar proposta", "Onboarding criado", "Cliente preenche checklist"], status: "Demonstrável (smoke test pendente)" },
];

interface ValidationRow {
  module_key: string;
  status: string | null;
  validated: boolean;
  notes: string | null;
}

function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      <Icon className="h-3 w-3" />{status}
    </Badge>
  );
}

export default function ProductAuditPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [validations, setValidations] = useState<Record<string, ValidationRow>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [routeChecks, setRouteChecks] = useState<Record<string, boolean>>({});
  const [waChecks, setWaChecks] = useState<Record<string, boolean>>({});
  const [voiceChecks, setVoiceChecks] = useState<Record<string, boolean>>({});
  const [propChecks, setPropChecks] = useState<Record<string, boolean>>({});
  const [onbChecks, setOnbChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("product_audit_validations")
        .select("module_key, status, validated, notes");
      const map: Record<string, ValidationRow> = {};
      (data ?? []).forEach((r: any) => { map[r.module_key] = r as ValidationRow; });
      setValidations(map);
    })();
  }, []);

  const effectiveStatus = (m: ModuleAudit): Status =>
    (validations[m.key]?.status as Status) || m.status;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MODULES.filter((m) => {
      if (statusFilter !== "all" && effectiveStatus(m) !== statusFilter) return false;
      if (!q) return true;
      return [m.module, ...m.routes, ...m.tables, ...m.components, ...m.edgeFunctions]
        .join(" ").toLowerCase().includes(q);
    });
  }, [search, statusFilter, validations]);

  const summary = useMemo(() => {
    const c: Record<Status, number> = {
      "Functional": 0, "Partial": 0, "Mock/Demo": 0,
      "Structure Only": 0, "Broken": 0, "Not Implemented": 0,
    };
    MODULES.forEach((m) => { c[effectiveStatus(m)]++; });
    return c;
  }, [validations]);

  const validatedCount = MODULES.filter((m) => validations[m.key]?.validated).length;

  async function persist(key: string, patch: Partial<ValidationRow>) {
    setSaving(key);
    const current = validations[key] ?? { module_key: key, status: null, validated: false, notes: null };
    const next: ValidationRow = { ...current, ...patch, module_key: key };
    setValidations((prev) => ({ ...prev, [key]: next }));
    const { error } = await supabase
      .from("product_audit_validations")
      .upsert({
        module_key: key,
        status: next.status,
        validated: next.validated,
        notes: next.notes,
        validated_by: next.validated ? user?.id ?? null : null,
        validated_at: next.validated ? new Date().toISOString() : null,
      }, { onConflict: "module_key" });
    setSaving(null);
    if (error) toast.error("Erro ao gravar: " + error.message);
    else toast.success("Validação atualizada");
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Sprint 0</Badge>
            <Badge variant="secondary" className="text-xs">Auditoria interna</Badge>
            <Badge className="text-xs">{validatedCount}/{MODULES.length} validados</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Product Audit</h1>
          <p className="text-muted-foreground">
            Estado funcional dos {MODULES.length} módulos do FastCRM, fluxos demo, checklists e relatório final.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {STATUS_OPTIONS.map((s) => {
            const Icon = STATUS_META[s].icon;
            return (
              <Card key={s}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s}</span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold mt-1">{summary[s]}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="routes">Rotas</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="voice">Voz</TabsTrigger>
            <TabsTrigger value="proposal">Proposta</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="flows">Fluxos demo</TabsTrigger>
            <TabsTrigger value="sprint1">Sprint 1</TabsTrigger>
            <TabsTrigger value="ghl-routing">GHL Routing</TabsTrigger>
            <TabsTrigger value="ghl-audit">GHL Audit</TabsTrigger>
            <TabsTrigger value="report">Relatório</TabsTrigger>
          </TabsList>

          <TabsContent value="sprint1" className="space-y-4">
            <Sprint1Tab />
          </TabsContent>

          <TabsContent value="ghl-routing" className="space-y-4">
            <GHLRoutingTab />
          </TabsContent>

          <TabsContent value="ghl-audit" className="space-y-4">
            <GHLRoutingAuditPanel />
          </TabsContent>

          {/* MÓDULOS */}
          <TabsContent value="modules" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pri</TableHead>
                    <TableHead>Rotas</TableHead>
                    <TableHead>Tabelas</TableHead>
                    <TableHead>Edge fns</TableHead>
                    <TableHead>Último erro</TableHead>
                    <TableHead>Próximo passo</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Validado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const v = validations[m.key];
                    const eff = effectiveStatus(m);
                    return (
                      <TableRow key={m.key}>
                        <TableCell className="font-medium align-top">{m.module}</TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={eff}
                            onValueChange={(val) => persist(m.key, { status: val })}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="mt-1"><StatusBadge status={eff} /></div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge className={PRIORITY_META[m.priority]}>{m.priority}</Badge>
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground max-w-[180px]">
                          {m.routes.length ? m.routes.map((r) => <div key={r}>{r}</div>) : "—"}
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground max-w-[180px]">
                          {m.tables.slice(0, 4).join(", ") || "—"}{m.tables.length > 4 ? `, +${m.tables.length - 4}` : ""}
                        </TableCell>
                        <TableCell className="align-top text-xs text-muted-foreground max-w-[200px]">
                          {m.edgeFunctions.slice(0, 3).join(", ") || "—"}{m.edgeFunctions.length > 3 ? `, +${m.edgeFunctions.length - 3}` : ""}
                        </TableCell>
                        <TableCell className="align-top text-xs text-amber-600 dark:text-amber-400 max-w-[200px]">
                          {m.lastError || "—"}
                        </TableCell>
                        <TableCell className="align-top text-xs max-w-[220px]">{m.nextStep}</TableCell>
                        <TableCell className="align-top min-w-[200px]">
                          <Textarea
                            className="min-h-[60px] text-xs"
                            placeholder="Notas…"
                            defaultValue={v?.notes ?? ""}
                            onBlur={(e) => {
                              if ((e.target.value || "") !== (v?.notes ?? ""))
                                persist(m.key, { notes: e.target.value });
                            }}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Button
                            size="sm"
                            variant={v?.validated ? "default" : "outline"}
                            disabled={saving === m.key}
                            onClick={() => persist(m.key, { validated: !v?.validated })}
                            className="gap-1"
                          >
                            {v?.validated ? <CheckCircle2 className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                            {v?.validated ? "Validado" : "Marcar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ROTAS */}
          <TabsContent value="routes">
            <Card>
              <CardHeader>
                <CardTitle>Rotas principais ({ROUTES_TO_TEST.length})</CardTitle>
                <CardDescription>Marca cada rota após verificar que abre sem erro.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ROUTES_TO_TEST.map((r) => (
                  <label key={r} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={!!routeChecks[r]}
                      onCheckedChange={(v) => setRouteChecks((p) => ({ ...p, [r]: !!v }))}
                    />
                    <code className="text-xs">{r}</code>
                  </label>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHECKLISTS */}
          {[
            { id: "whatsapp", title: "Checklist WhatsApp Pro", items: WHATSAPP_CHECKLIST, state: waChecks, set: setWaChecks },
            { id: "voice",    title: "Checklist VoiceHub",     items: VOICE_CHECKLIST,    state: voiceChecks, set: setVoiceChecks },
            { id: "proposal", title: "Checklist Proposal Portal", items: PROPOSAL_CHECKLIST, state: propChecks, set: setPropChecks },
            { id: "onboarding", title: "Checklist Onboarding Portal", items: ONBOARDING_CHECKLIST, state: onbChecks, set: setOnbChecks },
          ].map((c) => (
            <TabsContent key={c.id} value={c.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{c.title}</CardTitle>
                  <CardDescription>
                    {Object.values(c.state).filter(Boolean).length}/{c.items.length} concluídos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {c.items.map((it) => (
                    <label key={it} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={!!c.state[it]}
                        onCheckedChange={(v) => c.set((p: any) => ({ ...p, [it]: !!v }))}
                      />
                      <span className="text-sm">{it}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* FLUXOS */}
          <TabsContent value="flows" className="space-y-4">
            {DEMO_FLOWS.map((f) => (
              <Card key={f.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{f.name}</CardTitle>
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      {f.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {f.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* RELATÓRIO */}
          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {STATUS_OPTIONS.map((s) => (
                  <div key={s} className="p-3 rounded border">
                    <div className="text-muted-foreground text-xs">{s}</div>
                    <div className="text-2xl font-bold">{summary[s]}</div>
                  </div>
                ))}
                <div className="p-3 rounded border bg-primary/5 col-span-2 md:col-span-3">
                  <div className="text-xs text-muted-foreground">Validados manualmente</div>
                  <div className="text-2xl font-bold">{validatedCount} / {MODULES.length}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Bloqueadores críticos</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" /> WhatsApp Webhooks: validação HMAC inconsistente entre fornecedores (P1).</li>
                  <li className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" /> VoiceHub: integração SIP/3CX não validada end-to-end (P1).</li>
                  <li className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" /> Voice Provider Adapter sem credenciais reais configuradas (P2).</li>
                  <li className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" /> Proposal/Onboarding Portal: smoke test público pendente (P2).</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Correções aplicadas no Sprint 0 + Sprint 1</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> Criada página /admin/product-audit com persistência (tabela product_audit_validations + RLS super-admin).</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> Inventariadas 31 módulos, 23 rotas, 8 edge functions Voice e 8 WhatsApp ZAPI.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> Sprint 1: módulo <code>_shared/hmac.ts</code> com validação timing-safe (HMAC + shared secret + token) aplicado a whatsapp-webhook (Meta), whatsapp-pro-webhook e whatsapp-zapi-webhook.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> Sprint 1: tabela webhook_security_events com auditoria centralizada de validação.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> Sprint 1: edge functions voicehub-smoke-test e portals-smoke-test + tabela sprint_smoke_runs com persistência.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Recomendação final</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                  <div className="font-semibold mb-1">→ Consolidar antes de avançar</div>
                  <p className="text-muted-foreground">
                    Executar Sprint 1 focado em Comunicações (HMAC + VoiceHub + Portal smoke tests) antes de iniciar Fase 2B. Kernel está sólido mas a operação real dos canais ainda tem 4 pontos a fechar.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>P1: padronizar HMAC nos webhooks WhatsApp.</li>
                    <li>P1: validar VoiceHub end-to-end com nVoip/3CX.</li>
                    <li>P2: smoke test público de Proposal + Onboarding portals.</li>
                    <li>P3: manter Voice Recording desligado até decisão de compliance por workspace.</li>
                  </ul>
                </div>
                <div className="p-3 rounded border bg-muted/30">
                  <div className="font-semibold">Alternativas</div>
                  <ul className="list-disc list-inside mt-1">
                    <li>Avançar para Fase 2B se a demo crítica não envolver canais reais.</li>
                    <li>Ocultar temporariamente Voice Recording e Call Center / Queues / IVR (Structure Only).</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
