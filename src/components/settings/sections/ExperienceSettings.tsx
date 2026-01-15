import { useState } from "react";
import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  LayoutDashboard,
  Eye,
  LayoutGrid,
  Home,
  Copy,
  Table,
  Kanban as KanbanIcon,
  Sidebar,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExperienceSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

type DialogType = 
  | "dashboard-main" 
  | "dashboard-kpis" 
  | "dashboard-custom"
  | "view-agent"
  | "view-admin"
  | "view-viewer"
  | "layout-columns"
  | "layout-sidebar"
  | "homepage"
  | "homepage-widgets"
  | "saved-views"
  | "view-templates"
  | null;

// Widget configuration
const defaultWidgets = [
  { id: "leads-total", name: "Total de Leads", enabled: true },
  { id: "leads-new", name: "Leads Novos (Hoje)", enabled: true },
  { id: "opportunities-value", name: "Valor em Pipeline", enabled: true },
  { id: "tasks-pending", name: "Tarefas Pendentes", enabled: true },
  { id: "contacts-recent", name: "Contactos Recentes", enabled: false },
  { id: "conversion-rate", name: "Taxa de Conversão", enabled: true },
  { id: "revenue-month", name: "Receita Mensal", enabled: false },
  { id: "activities-today", name: "Atividades Hoje", enabled: true },
];

// KPI configuration per entity
const entityKpis = {
  leads: [
    { id: "total", name: "Total de Leads", enabled: true },
    { id: "new-today", name: "Novos Hoje", enabled: true },
    { id: "conversion", name: "Taxa de Conversão", enabled: true },
    { id: "avg-time", name: "Tempo Médio de Conversão", enabled: false },
  ],
  contacts: [
    { id: "total", name: "Total de Contactos", enabled: true },
    { id: "active", name: "Contactos Ativos", enabled: true },
    { id: "new-week", name: "Novos esta Semana", enabled: false },
  ],
  companies: [
    { id: "total", name: "Total de Empresas", enabled: true },
    { id: "by-size", name: "Por Tamanho", enabled: false },
    { id: "by-industry", name: "Por Indústria", enabled: true },
  ],
  opportunities: [
    { id: "total-value", name: "Valor Total", enabled: true },
    { id: "avg-deal", name: "Valor Médio", enabled: true },
    { id: "win-rate", name: "Taxa de Sucesso", enabled: true },
    { id: "pipeline", name: "Por Fase", enabled: true },
  ],
};

// Column configuration
const tableColumns = {
  leads: [
    { id: "name", name: "Nome", enabled: true, required: true },
    { id: "email", name: "Email", enabled: true },
    { id: "phone", name: "Telefone", enabled: true },
    { id: "status", name: "Estado", enabled: true },
    { id: "source", name: "Origem", enabled: false },
    { id: "assigned", name: "Responsável", enabled: true },
    { id: "created", name: "Data de Criação", enabled: false },
    { id: "score", name: "Pontuação", enabled: true },
  ],
  contacts: [
    { id: "name", name: "Nome", enabled: true, required: true },
    { id: "email", name: "Email", enabled: true },
    { id: "phone", name: "Telefone", enabled: true },
    { id: "company", name: "Empresa", enabled: true },
    { id: "job-title", name: "Cargo", enabled: false },
    { id: "tags", name: "Tags", enabled: true },
  ],
  companies: [
    { id: "name", name: "Nome", enabled: true, required: true },
    { id: "industry", name: "Indústria", enabled: true },
    { id: "size", name: "Tamanho", enabled: false },
    { id: "phone", name: "Telefone", enabled: true },
    { id: "website", name: "Website", enabled: false },
    { id: "contacts-count", name: "Nº Contactos", enabled: true },
  ],
};

// Sidebar modules
const sidebarModules = [
  { id: "overview", name: "Visão Geral", enabled: true, required: true },
  { id: "activities", name: "Atividades", enabled: true },
  { id: "notes", name: "Notas", enabled: true },
  { id: "tasks", name: "Tarefas", enabled: true },
  { id: "files", name: "Ficheiros", enabled: false },
  { id: "emails", name: "Emails", enabled: true },
  { id: "timeline", name: "Cronologia", enabled: true },
  { id: "related", name: "Relacionados", enabled: false },
  { id: "custom-fields", name: "Campos Personalizados", enabled: true },
];

// Homepage options
const homepageOptions = [
  { value: "dashboard", label: "Dashboard Principal" },
  { value: "leads", label: "Lista de Leads" },
  { value: "opportunities", label: "Pipeline de Oportunidades" },
  { value: "tasks", label: "Minhas Tarefas" },
  { value: "inbox", label: "Inbox" },
];

// Quick widgets for homepage
const quickWidgets = [
  { id: "pending-tasks", name: "Tarefas Pendentes", enabled: true },
  { id: "recent-leads", name: "Leads Recentes", enabled: true },
  { id: "upcoming-meetings", name: "Reuniões Agendadas", enabled: false },
  { id: "overdue-items", name: "Itens em Atraso", enabled: true },
  { id: "team-activity", name: "Atividade da Equipa", enabled: false },
  { id: "quick-actions", name: "Ações Rápidas", enabled: true },
];

// Role permissions configuration
const rolePermissions = {
  agent: {
    canViewAllLeads: false,
    canViewTeamLeads: true,
    canEditOwnLeads: true,
    canDeleteLeads: false,
    canExportData: false,
    canViewReports: false,
    canManageAutomations: false,
  },
  admin: {
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canEditOwnLeads: true,
    canDeleteLeads: true,
    canExportData: true,
    canViewReports: true,
    canManageAutomations: true,
  },
  viewer: {
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canEditOwnLeads: false,
    canDeleteLeads: false,
    canExportData: false,
    canViewReports: true,
    canManageAutomations: false,
  },
};

export function ExperienceSettings({ searchQuery = "", matchedSections }: ExperienceSettingsProps) {
  const { canUseFeature } = useSubscription();
  const hasCustomization = canUseFeature("dashboard_customization");
  const hasSearch = searchQuery.trim().length > 0;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  
  // State for configurations
  const [widgets, setWidgets] = useState(defaultWidgets);
  const [kpis, setKpis] = useState(entityKpis);
  const [columns, setColumns] = useState(tableColumns);
  const [sidebar, setSidebar] = useState(sidebarModules);
  const [homepage, setHomepage] = useState("dashboard");
  const [homeWidgets, setHomeWidgets] = useState(quickWidgets);
  const [permissions, setPermissions] = useState(rolePermissions);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const handleOpenDialog = (dialog: DialogType) => {
    if (!hasCustomization && ["dashboard-main", "dashboard-kpis", "dashboard-custom", "view-agent", "view-admin", "view-viewer"].includes(dialog || "")) {
      toast.error("Esta funcionalidade requer o plano Pro");
      return;
    }
    setActiveDialog(dialog);
  };

  const handleSaveChanges = () => {
    toast.success("Alterações guardadas com sucesso!");
    setActiveDialog(null);
  };

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const toggleKpi = (entity: keyof typeof entityKpis, id: string) => {
    setKpis(prev => ({
      ...prev,
      [entity]: prev[entity].map(k => k.id === id ? { ...k, enabled: !k.enabled } : k)
    }));
  };

  const toggleColumn = (entity: keyof typeof tableColumns, id: string) => {
    setColumns(prev => ({
      ...prev,
      [entity]: prev[entity].map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    }));
  };

  const toggleSidebarModule = (id: string) => {
    setSidebar(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const toggleHomeWidget = (id: string) => {
    setHomeWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const togglePermission = (role: keyof typeof rolePermissions, permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission as keyof typeof prev.agent]
      }
    }));
  };

  const dialogContent: Record<NonNullable<DialogType>, { title: string; description: string }> = {
    "dashboard-main": {
      title: "Dashboard Principal",
      description: "Personalize os widgets e métricas visíveis no dashboard principal.",
    },
    "dashboard-kpis": {
      title: "KPIs por Entidade",
      description: "Configure indicadores específicos para leads, contactos, empresas e oportunidades.",
    },
    "dashboard-custom": {
      title: "Criar Dashboard Personalizado",
      description: "Crie dashboards adicionais para diferentes equipas ou departamentos.",
    },
    "view-agent": {
      title: "Vista de Agente",
      description: "Configure as colunas, filtros e dados visíveis para utilizadores com cargo de Agente.",
    },
    "view-admin": {
      title: "Vista de Administrador",
      description: "Configure a vista completa com todas as funcionalidades para administradores.",
    },
    "view-viewer": {
      title: "Vista de Visualizador",
      description: "Limite a informação visível para utilizadores com acesso apenas de leitura.",
    },
    "layout-columns": {
      title: "Colunas de Tabela",
      description: "Escolha e ordene as colunas visíveis nas listas de cada módulo.",
    },
    "layout-sidebar": {
      title: "Módulos da Sidebar",
      description: "Active ou desactive secções na vista de detalhe de cada entidade.",
    },
    "homepage": {
      title: "Página Inicial Padrão",
      description: "Escolha qual página os utilizadores veem após fazer login.",
    },
    "homepage-widgets": {
      title: "Widgets Rápidos",
      description: "Configure quais widgets aparecem na página inicial (tarefas pendentes, leads recentes, etc.).",
    },
    "saved-views": {
      title: "Vistas Guardadas",
      description: "Gerir vistas personalizadas guardadas pelos utilizadores do workspace.",
    },
    "view-templates": {
      title: "Templates de Vista",
      description: "Crie templates de vista que podem ser aplicados por toda a equipa.",
    },
  };

  const renderDialogContent = () => {
    switch (activeDialog) {
      case "dashboard-main":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione os widgets a mostrar:</p>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {widgets.map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="text-sm font-medium">{widget.name}</span>
                    </div>
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case "dashboard-kpis":
        return (
          <Tabs defaultValue="leads" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="companies">Empresas</TabsTrigger>
              <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
            </TabsList>
            {(Object.keys(kpis) as Array<keyof typeof kpis>).map((entity) => (
              <TabsContent key={entity} value={entity} className="space-y-3 mt-4">
                {kpis[entity].map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">{kpi.name}</span>
                    <Switch
                      checked={kpi.enabled}
                      onCheckedChange={() => toggleKpi(entity, kpi.id)}
                    />
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        );

      case "dashboard-custom":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-name">Nome do Dashboard</Label>
              <Input
                id="dashboard-name"
                placeholder="Ex: Dashboard de Vendas"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Widgets a incluir</Label>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <div key={widget.id} className="flex items-center space-x-2">
                      <Checkbox id={`new-${widget.id}`} />
                      <Label htmlFor={`new-${widget.id}`} className="text-sm font-normal">
                        {widget.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label>Equipa/Departamento</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar equipa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sales">Vendas</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "view-agent":
      case "view-admin":
      case "view-viewer":
        const role = activeDialog.replace("view-", "") as keyof typeof rolePermissions;
        const roleLabels = {
          agent: "Agente",
          admin: "Administrador",
          viewer: "Visualizador",
        };
        const permissionLabels: Record<string, string> = {
          canViewAllLeads: "Ver todos os leads",
          canViewTeamLeads: "Ver leads da equipa",
          canEditOwnLeads: "Editar próprios leads",
          canDeleteLeads: "Eliminar leads",
          canExportData: "Exportar dados",
          canViewReports: "Ver relatórios",
          canManageAutomations: "Gerir automações",
        };
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permissões para utilizadores com cargo de {roleLabels[role]}:
            </p>
            <div className="space-y-3">
              {Object.entries(permissions[role]).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{permissionLabels[key]}</span>
                  <Switch
                    checked={value}
                    onCheckedChange={() => togglePermission(role, key)}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case "layout-columns":
        return (
          <Tabs defaultValue="leads" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="companies">Empresas</TabsTrigger>
            </TabsList>
            {(Object.keys(columns) as Array<keyof typeof columns>).map((entity) => (
              <TabsContent key={entity} value={entity} className="space-y-3 mt-4">
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-2">
                    {columns[entity].map((col) => (
                      <div key={col.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          <span className="text-sm font-medium">{col.name}</span>
                          {col.required && (
                            <span className="text-xs text-muted-foreground">(obrigatório)</span>
                          )}
                        </div>
                        <Switch
                          checked={col.enabled}
                          onCheckedChange={() => toggleColumn(entity, col.id)}
                          disabled={col.required}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "layout-sidebar":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ative ou desative módulos na barra lateral de detalhe:
            </p>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {sidebar.map((module) => (
                  <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="text-sm font-medium">{module.name}</span>
                      {module.required && (
                        <span className="text-xs text-muted-foreground">(obrigatório)</span>
                      )}
                    </div>
                    <Switch
                      checked={module.enabled}
                      onCheckedChange={() => toggleSidebarModule(module.id)}
                      disabled={module.required}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case "homepage":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Página inicial após login</Label>
              <Select value={homepage} onValueChange={setHomepage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar página" />
                </SelectTrigger>
                <SelectContent>
                  {homepageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Os utilizadores serão redirecionados para esta página após fazer login no sistema.
              </p>
            </div>
          </div>
        );

      case "homepage-widgets":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os widgets rápidos a mostrar na página inicial:
            </p>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {homeWidgets.map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">{widget.name}</span>
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={() => toggleHomeWidget(widget.id)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case "saved-views":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Vistas guardadas pelos utilizadores:</p>
            </div>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {[
                  { name: "Leads Quentes", entity: "Leads", user: "João Silva", shared: true },
                  { name: "Oportunidades em Fecho", entity: "Oportunidades", user: "Maria Costa", shared: false },
                  { name: "Empresas Ativas", entity: "Empresas", user: "Admin", shared: true },
                  { name: "Contactos Recentes", entity: "Contactos", user: "Pedro Santos", shared: false },
                ].map((view, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{view.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {view.entity} • {view.user} {view.shared && "• Partilhada"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case "view-templates":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Template</Label>
              <Input
                id="template-name"
                placeholder="Ex: Vista Comercial Padrão"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Entidade</Label>
              <Select defaultValue="leads">
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="contacts">Contactos</SelectItem>
                  <SelectItem value="companies">Empresas</SelectItem>
                  <SelectItem value="opportunities">Oportunidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aplicar a</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar âmbito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os utilizadores</SelectItem>
                  <SelectItem value="new">Apenas novos utilizadores</SelectItem>
                  <SelectItem value="role-agent">Agentes</SelectItem>
                  <SelectItem value="role-admin">Administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="default-template" />
              <Label htmlFor="default-template" className="text-sm font-normal">
                Definir como template padrão
              </Label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboards */}
      <SettingsSection
        title="Dashboards"
        description="Configurar painéis de controlo e métricas"
        icon={<LayoutDashboard className="h-5 w-5" />}
        isPremium={!hasCustomization}
        isLocked={!hasCustomization}
        planRequired="Pro"
      >
        <SettingsItem
          title="Dashboard Principal"
          description="Personalizar widgets e métricas visíveis"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("dashboard-main")}>
              Personalizar
            </Button>
          }
        />
        <SettingsItem
          title="KPIs por Entidade"
          description="Definir indicadores para leads, contactos, etc."
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("dashboard-kpis")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Dashboards Personalizados"
          description="Criar dashboards adicionais para diferentes equipas"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("dashboard-custom")}>
              Criar Dashboard
            </Button>
          }
        />
      </SettingsSection>

      {/* Role-based Views */}
      <SettingsSection
        title="Vistas por Cargo"
        description="Definir o que cada cargo vê por defeito"
        icon={<Eye className="h-5 w-5" />}
        isPremium={!hasCustomization}
        isLocked={!hasCustomization}
        planRequired="Pro"
      >
        <SettingsItem
          title="Vista de Agente"
          description="Configurar colunas e filtros para agentes"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-agent")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Vista de Administrador"
          description="Configurar vista completa para admins"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-admin")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Vista de Visualizador"
          description="Limitar informação visível para viewers"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-viewer")}>
              Configurar
            </Button>
          }
        />
      </SettingsSection>

      {/* Layout Customization */}
      <SettingsSection
        title="Personalização de Layout"
        description="Configurar listas, boards e barras laterais"
        icon={<LayoutGrid className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="border border-border rounded-lg p-4 text-center">
            <Table className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Tabelas</p>
            <p className="text-sm text-muted-foreground">Colunas, ordenação</p>
          </div>
          <div className="border border-border rounded-lg p-4 text-center">
            <KanbanIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Boards</p>
            <p className="text-sm text-muted-foreground">Kanban, colunas</p>
          </div>
          <div className="border border-border rounded-lg p-4 text-center">
            <Sidebar className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Sidebars</p>
            <p className="text-sm text-muted-foreground">Detalhes, contexto</p>
          </div>
        </div>
        <SettingsItem
          title="Colunas de Tabela"
          description="Escolher e ordenar colunas visíveis nas listas"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("layout-columns")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Módulos da Sidebar"
          description="Ativar/desativar secções na vista de detalhe"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("layout-sidebar")}>
              Configurar
            </Button>
          }
        />
      </SettingsSection>

      {/* Homepage Configuration */}
      <SettingsSection
        title="Página Inicial"
        description="Configurar o que os utilizadores veem ao entrar"
        icon={<Home className="h-5 w-5" />}
      >
        <SettingsItem
          title="Página Inicial Padrão"
          description="Escolher página de destino após login"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("homepage")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Widgets Rápidos"
          description="Mostrar tarefas pendentes, leads recentes, etc."
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("homepage-widgets")}>
              Configurar
            </Button>
          }
        />
      </SettingsSection>

      {/* View Templates */}
      <SettingsSection
        title="Templates de Vista"
        description="Guardar e partilhar configurações de vista"
        icon={<Copy className="h-5 w-5" />}
      >
        <SettingsItem
          title="Vistas Guardadas"
          description="Gerir vistas guardadas pelos utilizadores"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("saved-views")}>
              Gerir Vistas
            </Button>
          }
        />
        <SettingsItem
          title="Templates do Workspace"
          description="Criar templates de vista para toda a equipa"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-templates")}>
              Criar Template
            </Button>
          }
        />
      </SettingsSection>

      {/* Configuration Dialog */}
      <Dialog open={activeDialog !== null} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeDialog && dialogContent[activeDialog]?.title}
            </DialogTitle>
            <DialogDescription>
              {activeDialog && dialogContent[activeDialog]?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderDialogContent()}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveChanges}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
