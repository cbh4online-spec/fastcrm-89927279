import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Package, 
  Settings, 
  BarChart3, 
  Edit,
  Eye,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { SAMPLE_MODULES, CATEGORY_INFO, type MarketplaceModule } from "@/types/marketplace";
import { ModuleTemplateForm } from "@/components/marketplace/admin/ModuleTemplateForm";
import { type ModuleTemplate } from "@/types/module-template";
import { getIconByName } from "@/lib/icons";

export default function MarketplaceAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("modules");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingModule, setEditingModule] = useState<MarketplaceModule | null>(null);

  // Filter modules
  const filteredModules = SAMPLE_MODULES.filter(module =>
    module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.tagline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Ativo</Badge>;
      case "pending_approval":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case "inactive":
        return <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateModule = (template: ModuleTemplate) => {
    console.log("Creating module:", template);
    toast.success("Módulo criado com sucesso!");
    setIsCreating(false);
  };

  const handleEditModule = (template: ModuleTemplate) => {
    console.log("Updating module:", template);
    toast.success("Módulo atualizado com sucesso!");
    setEditingModule(null);
  };

  if (isCreating) {
    return (
      <div className="container py-6">
        <Button 
          variant="ghost" 
          onClick={() => setIsCreating(false)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <ModuleTemplateForm 
          onSave={handleCreateModule}
          onPreview={(template) => {
            console.log("Preview:", template);
            toast.info("Pré-visualização em desenvolvimento");
          }}
        />
      </div>
    );
  }

  if (editingModule) {
    // Convert MarketplaceModule to ModuleTemplate format
    const templateData = {
      ...editingModule,
      capabilities: {
        creates_data: editingModule.permissions.data_permissions.some(p => p.write),
        reads_data: editingModule.permissions.data_permissions.some(p => p.read),
        updates_data: editingModule.permissions.data_permissions.some(p => p.write),
        generates_insights: editingModule.internal_type === "ai_service",
        triggers_automations: editingModule.permissions.can_trigger_automations
      },
      crm_integration: {
        entities_affected: editingModule.permissions.data_permissions.map(p => p.entity),
        triggers_on: [],
        validates_data: true,
        creates_activities: editingModule.permissions.can_create_activities
      },
      role_permissions: [
        { role: "admin" as const, can_access: true, can_configure: true, can_view_usage: true },
        { role: "manager" as const, can_access: true, can_configure: false, can_view_usage: true },
        { role: "sales" as const, can_access: true, can_configure: false, can_view_usage: false },
        { role: "support" as const, can_access: true, can_configure: false, can_view_usage: false },
        { role: "viewer" as const, can_access: false, can_configure: false, can_view_usage: false }
      ],
      ux: {
        placement: "standalone_page" as const,
        menu_section: "tools" as const,
        menu_label: editingModule.name,
        menu_icon: editingModule.icon,
        primary_actions: []
      },
      logs: {
        log_actions: true,
        log_data_changes: true,
        log_api_calls: true,
        log_errors: true,
        log_usage: true,
        retention_days: 90,
        alert_on_error: true,
        alert_on_limit_reached: true
      },
      activation: {
        on_activate: {
          runs_setup: true,
          creates_default_settings: true,
          sends_welcome_email: true
        },
        on_deactivate: {
          preserves_data: true,
          preserves_settings: true,
          sends_notification: true
        },
        allows_reactivation: true,
        reactivation_restores_settings: true
      }
    };

    return (
      <div className="container py-6">
        <Button 
          variant="ghost" 
          onClick={() => setEditingModule(null)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <ModuleTemplateForm 
          initialData={templateData}
          onSave={handleEditModule}
          onPreview={(template) => {
            console.log("Preview:", template);
            toast.info("Pré-visualização em desenvolvimento");
          }}
        />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestão do Marketplace</h1>
            <p className="text-muted-foreground">
              Criar, editar e gerir módulos do marketplace
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Módulo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Módulos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{SAMPLE_MODULES.length}</div>
            <p className="text-xs text-muted-foreground">
              {SAMPLE_MODULES.filter(m => m.status === "active").length} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instalações</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {SAMPLE_MODULES.reduce((acc, m) => acc + m.installs_count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de instalações
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(SAMPLE_MODULES.map(m => m.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Categorias ativas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Médio</CardTitle>
            <svg className="h-4 w-4 text-muted-foreground fill-current" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(SAMPLE_MODULES.reduce((acc, m) => acc + (m.rating || 0), 0) / SAMPLE_MODULES.length).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Média de avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar módulos..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Modules Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium">Módulo</th>
                      <th className="p-4 text-left font-medium">Categoria</th>
                      <th className="p-4 text-left font-medium">Tipo</th>
                      <th className="p-4 text-left font-medium">Status</th>
                      <th className="p-4 text-left font-medium">Instalações</th>
                      <th className="p-4 text-left font-medium">Preço</th>
                      <th className="p-4 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModules.map((module) => {
                      const categoryInfo = CATEGORY_INFO[module.category];
                      const IconComponent = getIconByName(module.icon);

                      return (
                        <tr key={module.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${categoryInfo?.color} bg-current/10`}>
                                <IconComponent className={`h-5 w-5 ${categoryInfo?.color}`} />
                              </div>
                              <div>
                                <div className="font-medium">{module.name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {module.tagline}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{categoryInfo?.name}</Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {module.internal_type === "connector" && "Conector"}
                            {module.internal_type === "ai_service" && "Serviço IA"}
                            {module.internal_type === "embedded_app" && "App Embebida"}
                            {module.internal_type === "native_feature" && "Nativo"}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(module.status)}
                          </td>
                          <td className="p-4 text-sm">
                            {module.installs_count.toLocaleString()}
                          </td>
                          <td className="p-4 text-sm">
                            {module.pricing.base_price === 0 ? (
                              <span className="text-green-600">Grátis</span>
                            ) : (
                              <span>{module.pricing.base_price}€/mês</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingModule(module)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver no Marketplace
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  Ver Analytics
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics do Marketplace</CardTitle>
              <CardDescription>
                Métricas de uso e performance dos módulos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[400px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">Analytics em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Marketplace</CardTitle>
              <CardDescription>
                Configurações globais do marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[400px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Settings className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">Configurações em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
