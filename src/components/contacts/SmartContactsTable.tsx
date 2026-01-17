import { useState } from "react";
import { useSmartContacts, useAnalyzeContact, useBulkAnalyzeContacts, SmartContactsFilters } from "@/hooks/useSmartContacts";
import { useContacts } from "@/hooks/useContacts";
import { SmartContactsKPIs } from "./SmartContactsKPIs";
import { SmartContactsFilters as FiltersComponent } from "./SmartContactsFilters";
import { SmartContactRow } from "./SmartContactRow";
import { CreateContactDialog } from "./CreateContactDialog";
import { BulkActionsBar } from "@/components/crm/unified/BulkActionsBar";
import { BulkEditField } from "@/components/crm/unified/BulkEditDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, UserCog, HeadsetIcon, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ViewPreset = "all" | "sales" | "support" | "manager";

const viewPresets: Record<ViewPreset, { label: string; icon: React.ReactNode }> = {
  all: { label: "Todos", icon: <Users className="w-4 h-4" /> },
  sales: { label: "Vendas", icon: <UserCog className="w-4 h-4" /> },
  support: { label: "Suporte", icon: <HeadsetIcon className="w-4 h-4" /> },
  manager: { label: "Gestor", icon: <BarChart3 className="w-4 h-4" /> },
};

// Todos os campos editáveis em massa para contactos
const contactBulkEditFields: BulkEditField[] = [
  // Informação básica
  { key: "name", label: "Nome", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Telefone", type: "text" },
  { key: "whatsapp_number", label: "WhatsApp", type: "text" },
  { key: "has_whatsapp", label: "Tem WhatsApp", type: "boolean" },
  { key: "company", label: "Empresa", type: "text" },
  { key: "job_title", label: "Cargo", type: "text" },
  { key: "commercial_name", label: "Nome Comercial", type: "text" },
  
  // Localização
  { key: "address", label: "Morada", type: "text" },
  { key: "city", label: "Cidade", type: "text" },
  { key: "postal_code", label: "Código Postal", type: "text" },
  { key: "country", label: "País", type: "text" },
  
  // Classificação e Status
  { key: "source", label: "Origem", type: "select", options: [
    { value: "website", label: "Website" },
    { value: "referral", label: "Referência" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "cold_call", label: "Cold Call" },
    { value: "event", label: "Evento" },
    { value: "import", label: "Importação" },
    { value: "other", label: "Outro" },
  ]},
  { key: "lead_source", label: "Fonte do Lead", type: "text" },
  { key: "client_status", label: "Estado do Cliente", type: "select", options: [
    { value: "prospect", label: "Prospeto" },
    { value: "lead", label: "Lead" },
    { value: "active", label: "Ativo" },
    { value: "churned", label: "Perdido" },
    { value: "inactive", label: "Inativo" },
  ]},
  { key: "client_types", label: "Tipo de Cliente", type: "text" },
  { key: "abc_category", label: "Categoria ABC", type: "select", options: [
    { value: "A", label: "A - Alto valor" },
    { value: "B", label: "B - Médio valor" },
    { value: "C", label: "C - Baixo valor" },
  ]},
  
  // IA e Análise
  { key: "ai_temperature", label: "Temperatura (IA)", type: "select", options: [
    { value: "cold", label: "Frio" },
    { value: "warm", label: "Morno" },
    { value: "hot", label: "Quente" },
  ]},
  { key: "ai_contact_type", label: "Tipo de Contacto (IA)", type: "select", options: [
    { value: "decision_maker", label: "Decisor" },
    { value: "influencer", label: "Influenciador" },
    { value: "champion", label: "Champion" },
    { value: "blocker", label: "Blocker" },
    { value: "end_user", label: "Utilizador Final" },
    { value: "unknown", label: "Desconhecido" },
  ]},
  { key: "ai_next_action_type", label: "Próxima Ação (IA)", type: "select", options: [
    { value: "reply_manual", label: "Responder manualmente" },
    { value: "send_template", label: "Enviar template" },
    { value: "create_opportunity", label: "Criar oportunidade" },
    { value: "activate_automation", label: "Ativar automação" },
    { value: "archive", label: "Arquivar" },
    { value: "follow_up", label: "Follow-up" },
    { value: "schedule_meeting", label: "Agendar reunião" },
    { value: "nurture", label: "Nutrir" },
  ]},
  { key: "contact_score", label: "Score do Contacto", type: "number" },
  { key: "conversion_probability", label: "Probabilidade de Conversão (%)", type: "number" },
  { key: "estimated_value", label: "Valor Estimado (€)", type: "number" },
  
  // Automação e Atribuição
  { key: "automation_active", label: "Automação Ativa", type: "boolean" },
  { key: "assigned_to", label: "Responsável", type: "text" },
  { key: "is_primary_contact", label: "Contacto Principal", type: "boolean" },
  
  // Dados fiscais
  { key: "tax_id", label: "NIF", type: "text" },
  { key: "entity_type", label: "Tipo de Entidade", type: "select", options: [
    { value: "consumidor_final", label: "Consumidor Final" },
    { value: "eni", label: "ENI" },
    { value: "empresa", label: "Empresa" },
  ]},
  { key: "fiscal_regime", label: "Regime Fiscal", type: "text" },
  { key: "is_fiscal_address", label: "Morada Fiscal", type: "boolean" },
  
  // Negócio
  { key: "business_area", label: "Área de Negócio", type: "text" },
  { key: "cae_code", label: "Código CAE", type: "text" },
  { key: "cae_description", label: "Descrição CAE", type: "text" },
  
  // Financeiro
  { key: "credit_active", label: "Crédito Ativo", type: "boolean" },
  { key: "credit_limit", label: "Limite de Crédito (€)", type: "number" },
  { key: "payment_conditions", label: "Condições de Pagamento", type: "text" },
  { key: "preferred_payment_method", label: "Método de Pagamento Preferido", type: "select", options: [
    { value: "transfer", label: "Transferência" },
    { value: "card", label: "Cartão" },
    { value: "mbway", label: "MB Way" },
    { value: "check", label: "Cheque" },
    { value: "cash", label: "Dinheiro" },
  ]},
  { key: "average_ticket", label: "Ticket Médio (€)", type: "number" },
  { key: "total_revenue", label: "Receita Total (€)", type: "number" },
  
  // Histórico de vendas
  { key: "sales_2023", label: "Vendas 2023 (€)", type: "number" },
  { key: "sales_2024", label: "Vendas 2024 (€)", type: "number" },
  { key: "sales_2025", label: "Vendas 2025 (€)", type: "number" },
  { key: "sales_2026", label: "Vendas 2026 (€)", type: "number" },
  
  // Redes sociais
  { key: "linkedin_url", label: "LinkedIn", type: "text" },
  { key: "facebook_url", label: "Facebook", type: "text" },
  { key: "instagram_url", label: "Instagram", type: "text" },
  { key: "twitter_url", label: "Twitter/X", type: "text" },
  
  // Notas
  { key: "notes", label: "Notas", type: "text" },
];

export function SmartContactsTable() {
  const [filters, setFilters] = useState<SmartContactsFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeView, setActiveView] = useState<ViewPreset>("all");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: contacts, isLoading, refetch } = useSmartContacts(filters);
  const { deleteContacts, addTagsToContacts, bulkUpdateContacts } = useContacts();
  const analyze = useAnalyzeContact();
  const bulkAnalyze = useBulkAnalyzeContacts();

  const allSelected = contacts && contacts.length > 0 && selectedIds.size === contacts.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(contacts?.map(c => c.id) || []));
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try { await analyze.mutateAsync({ contactId: id }); toast.success("Contacto analisado"); }
    catch { toast.error("Erro ao analisar"); }
    finally { setAnalyzingId(null); }
  };

  const handleBulkAnalyze = async () => {
    toast.loading(`A analisar ${selectedIds.size}...`);
    try { const r = await bulkAnalyze.mutateAsync(Array.from(selectedIds)); toast.dismiss(); toast.success(`${r.successful} analisados`); setSelectedIds(new Set()); }
    catch { toast.dismiss(); toast.error("Erro"); }
  };

  const handleBulkDelete = async () => {
    await deleteContacts.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleAddTags = async (tags: string[]) => {
    await addTagsToContacts.mutateAsync({ ids: Array.from(selectedIds), tags });
    setSelectedIds(new Set());
  };

  const handleBulkEdit = async (changes: Record<string, unknown>) => {
    await bulkUpdateContacts.mutateAsync({ ids: Array.from(selectedIds), changes });
    toast.success(`${selectedIds.size} contactos atualizados`);
    setSelectedIds(new Set());
    refetch();
  };

  const handleExport = () => {
    // Export selected contacts as CSV
    const selected = contacts?.filter(c => selectedIds.has(c.id)) || [];
    const csv = [
      ["Nome", "Email", "Telefone", "Empresa", "Temperatura", "Score"].join(","),
      ...selected.map(c => [c.name, c.email || "", c.phone || "", c.company || "", c.ai_temperature || "", c.contact_score || ""].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  };

  const shouldShowAdvanced = showAdvanced || activeView === "sales" || activeView === "manager";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tabela de Contactos Inteligente</h1>
          <p className="text-muted-foreground">Decide rapidamente o que fazer com cada contacto</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Contacto</Button>
        </div>
      </div>

      <SmartContactsKPIs />

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewPreset)}>
        <TabsList>
          {Object.entries(viewPresets).map(([key, preset]) => (
            <TabsTrigger key={key} value={key} className="gap-2">{preset.icon}{preset.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FiltersComponent filters={filters} onFiltersChange={setFilters} showAdvanced={shouldShowAdvanced} onToggleAdvanced={() => setShowAdvanced(!showAdvanced)} />

      {selectedIds.size > 0 && (
        <BulkActionsBar
          entityType="contacts"
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onDelete={handleBulkDelete}
          onExport={handleExport}
          onAddTags={handleAddTags}
          onBulkEdit={handleBulkEdit}
          editableFields={contactBulkEditFields}
        />
      )}

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={allSelected} ref={(el) => { if (el) (el as any).indeterminate = someSelected; }} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead className="min-w-[180px]">Contacto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead><span className="flex items-center gap-1">Temperatura<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead><span className="flex items-center gap-1">Score<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="min-w-[150px]"><span className="flex items-center gap-1">Próxima Ação<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead>
              <TableHead>SLA</TableHead>
              {shouldShowAdvanced && (<><TableHead>Potencial €</TableHead><TableHead>Prob. %</TableHead><TableHead>Automação</TableHead><TableHead className="min-w-[180px]"><span className="flex items-center gap-1">Insight<span className="text-[10px] text-muted-foreground">IA</span></span></TableHead></>)}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={shouldShowAdvanced ? 14 : 10} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />A carregar...</div></TableCell></TableRow>
            ) : !contacts?.length ? (
              <TableRow><TableCell colSpan={shouldShowAdvanced ? 14 : 10} className="text-center py-12"><div className="flex flex-col items-center gap-3 text-muted-foreground"><Users className="w-12 h-12 opacity-50" /><p className="text-lg font-medium">Quando entrarem contactos, a IA vai organizá-los por ti</p><Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Contacto</Button></div></TableCell></TableRow>
            ) : contacts.map(c => (
              <SmartContactRow key={c.id} contact={c} isSelected={selectedIds.has(c.id)} onToggleSelect={() => toggleSelect(c.id)} onAnalyze={() => handleAnalyze(c.id)} isAnalyzing={analyzingId === c.id} showAdvanced={shouldShowAdvanced} />
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateContactDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
