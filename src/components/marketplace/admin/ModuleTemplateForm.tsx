import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Shield,
  Database,
  CreditCard,
  Layout,
  Activity,
  Settings2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

import { 
  ModuleTemplate, 
  DEFAULT_MODULE_TEMPLATE,
  validateModuleTemplate,
  INDUSTRY_LABELS,
  type Industry,
  type CRMEntity,
  type UserRole
} from "@/types/module-template";
import { 
  CATEGORY_INFO, 
  type ModuleCategory, 
  type ModuleInternalType,
  type ModulePricingType,
  type ModuleAccessMethod
} from "@/types/marketplace";
import { ModuleChecklist } from "./ModuleChecklist";

interface ModuleTemplateFormProps {
  initialData?: Partial<ModuleTemplate>;
  onSave: (template: ModuleTemplate) => void;
  onPreview?: (template: Partial<ModuleTemplate>) => void;
}

// Using DataPermission entity type from marketplace.ts
type DataPermissionEntity = "leads" | "contacts" | "companies" | "opportunities" | "products" | "proposals" | "invoices" | "conversations" | "templates" | "automations";

const CRM_ENTITIES: { value: DataPermissionEntity; label: string }[] = [
  { value: "leads", label: "Leads" },
  { value: "contacts", label: "Contactos" },
  { value: "companies", label: "Empresas" },
  { value: "opportunities", label: "Oportunidades" },
  { value: "products", label: "Produtos" },
  { value: "proposals", label: "Propostas" },
  { value: "invoices", label: "Faturas" },
  { value: "conversations", label: "Conversas" },
  { value: "templates", label: "Templates" },
  { value: "automations", label: "Automações" }
];

const INTERNAL_TYPES: { value: ModuleInternalType; label: string; description: string }[] = [
  { value: "connector", label: "Conector API", description: "Integração com API externa" },
  { value: "ai_service", label: "Serviço IA", description: "Funcionalidade powered by AI" },
  { value: "embedded_app", label: "App Embebida", description: "Aplicação completa (iframe)" },
  { value: "native_feature", label: "Funcionalidade Nativa", description: "Feature built-in do FastCRM" }
];

const PRICING_TYPES: { value: ModulePricingType; label: string }[] = [
  { value: "free", label: "Grátis" },
  { value: "fixed_monthly", label: "Mensal Fixo" },
  { value: "usage_based", label: "Por Consumo" },
  { value: "credits", label: "Créditos" },
  { value: "custom", label: "Personalizado" }
];

export function ModuleTemplateForm({ initialData, onSave, onPreview }: ModuleTemplateFormProps) {
  const [template, setTemplate] = useState<Partial<ModuleTemplate>>({
    ...DEFAULT_MODULE_TEMPLATE,
    ...initialData
  });
  
  const [activeTab, setActiveTab] = useState("identity");
  const [newUseCase, setNewUseCase] = useState("");
  const [newResult, setNewResult] = useState("");

  const validation = validateModuleTemplate(template);

  const updateTemplate = (updates: Partial<ModuleTemplate>) => {
    setTemplate(prev => ({ ...prev, ...updates }));
  };

  const addUseCase = () => {
    if (newUseCase.trim()) {
      updateTemplate({
        use_cases: [...(template.use_cases || []), newUseCase.trim()]
      });
      setNewUseCase("");
    }
  };

  const removeUseCase = (index: number) => {
    updateTemplate({
      use_cases: template.use_cases?.filter((_, i) => i !== index)
    });
  };

  const addExpectedResult = () => {
    if (newResult.trim()) {
      updateTemplate({
        expected_results: [...(template.expected_results || []), newResult.trim()]
      });
      setNewResult("");
    }
  };

  const removeExpectedResult = (index: number) => {
    updateTemplate({
      expected_results: template.expected_results?.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    if (!validation.isValid) {
      toast.error("Existem erros no formulário", {
        description: validation.errors[0]
      });
      return;
    }
    
    onSave(template as ModuleTemplate);
    toast.success("Módulo guardado com sucesso!");
  };

  const handlePreview = () => {
    onPreview?.(template);
  };

  const toggleDataPermission = (entity: DataPermissionEntity, permission: "read" | "write" | "delete") => {
    const currentPermissions = template.permissions?.data_permissions || [];
    const existingIndex = currentPermissions.findIndex(p => p.entity === entity);
    
    if (existingIndex >= 0) {
      const updated = [...currentPermissions];
      updated[existingIndex] = {
        ...updated[existingIndex],
        [permission]: !updated[existingIndex][permission]
      };
      updateTemplate({
        permissions: {
          ...template.permissions!,
          data_permissions: updated
        }
      });
    } else {
      updateTemplate({
        permissions: {
          ...template.permissions!,
          data_permissions: [
            ...currentPermissions,
            { entity, read: permission === "read", write: permission === "write", delete: permission === "delete" }
          ]
        }
      });
    }
  };

  const getDataPermission = (entity: DataPermissionEntity, permission: "read" | "write" | "delete"): boolean => {
    const perm = template.permissions?.data_permissions?.find(p => p.entity === entity);
    return perm?.[permission] || false;
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{template.name || "Novo Módulo"}</h2>
          <p className="text-muted-foreground">
            {template.internal_type ? INTERNAL_TYPES.find(t => t.value === template.internal_type)?.label : "Definir tipo"}
          </p>
        </div>
        <div className="flex gap-2">
          {onPreview && (
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Pré-visualizar
            </Button>
          )}
          <Button onClick={handleSave} disabled={!validation.isValid}>
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {validation.errors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              ))}
              {validation.warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {warning}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="identity" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Identidade</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Permissões</span>
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">CRM</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="ux" className="gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">UX</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade do Módulo</CardTitle>
              <CardDescription>
                Informação comercial visível aos clientes. Nunca fale em APIs ou tecnologia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Comercial *</Label>
                  <Input
                    id="name"
                    value={template.name || ""}
                    onChange={(e) => updateTemplate({ name: e.target.value })}
                    placeholder="Ex: Lead Enricher Pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (ID técnico) *</Label>
                  <Input
                    id="slug"
                    value={template.slug || ""}
                    onChange={(e) => updateTemplate({ slug: e.target.value.toLowerCase().replace(/\s/g, "-") })}
                    placeholder="Ex: lead-enricher-pro"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline (1 frase) *</Label>
                <Input
                  id="tagline"
                  value={template.tagline || ""}
                  onChange={(e) => updateTemplate({ tagline: e.target.value })}
                  placeholder="Ex: Enriqueça leads com dados empresariais automaticamente"
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">{template.tagline?.length || 0}/80 caracteres</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={template.category} 
                    onValueChange={(value: ModuleCategory) => updateTemplate({ category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CATEGORY_INFO).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internal_type">Tipo Interno (oculto) *</Label>
                  <Select 
                    value={template.internal_type} 
                    onValueChange={(value: ModuleInternalType) => updateTemplate({ internal_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERNAL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div>{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Longa *</Label>
                <Textarea
                  id="description"
                  value={template.description || ""}
                  onChange={(e) => updateTemplate({ description: e.target.value })}
                  placeholder="Descreva o módulo focando nos benefícios e casos de uso..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Público-Alvo *</Label>
                <Input
                  id="target_audience"
                  value={template.target_audience || ""}
                  onChange={(e) => updateTemplate({ target_audience: e.target.value })}
                  placeholder="Ex: Equipas de vendas B2B e marketing"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Resultados Esperados *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newResult}
                    onChange={(e) => setNewResult(e.target.value)}
                    placeholder="Ex: 80% menos tempo em qualificação"
                    onKeyDown={(e) => e.key === "Enter" && addExpectedResult()}
                  />
                  <Button type="button" onClick={addExpectedResult} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.expected_results?.map((result, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {result}
                      <button onClick={() => removeExpectedResult(i)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Casos de Uso (mínimo 3)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newUseCase}
                    onChange={(e) => setNewUseCase(e.target.value)}
                    placeholder="Ex: Qualificar leads automaticamente"
                    onKeyDown={(e) => e.key === "Enter" && addUseCase()}
                  />
                  <Button type="button" onClick={addUseCase} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.use_cases?.map((useCase, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {useCase}
                      <button onClick={() => removeUseCase(i)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Permissões de Dados</CardTitle>
              <CardDescription>
                Defina exatamente que dados o módulo pode ler, escrever e eliminar. Princípio do menor privilégio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Entidade</th>
                      <th className="p-3 text-center font-medium">Ler</th>
                      <th className="p-3 text-center font-medium">Escrever</th>
                      <th className="p-3 text-center font-medium">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CRM_ENTITIES.map(entity => (
                      <tr key={entity.value} className="border-b last:border-0">
                        <td className="p-3 font-medium">{entity.label}</td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={getDataPermission(entity.value, "read")}
                            onCheckedChange={() => toggleDataPermission(entity.value, "read")}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={getDataPermission(entity.value, "write")}
                            onCheckedChange={() => toggleDataPermission(entity.value, "write")}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={getDataPermission(entity.value, "delete")}
                            onCheckedChange={() => toggleDataPermission(entity.value, "delete")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Capacidades Adicionais</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Enviar Emails</Label>
                      <p className="text-xs text-muted-foreground">Pode enviar emails em nome do utilizador</p>
                    </div>
                    <Switch
                      checked={template.permissions?.can_send_emails}
                      onCheckedChange={(checked) => updateTemplate({
                        permissions: { ...template.permissions!, can_send_emails: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Enviar WhatsApp</Label>
                      <p className="text-xs text-muted-foreground">Pode enviar mensagens WhatsApp</p>
                    </div>
                    <Switch
                      checked={template.permissions?.can_send_whatsapp}
                      onCheckedChange={(checked) => updateTemplate({
                        permissions: { ...template.permissions!, can_send_whatsapp: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Criar Atividades</Label>
                      <p className="text-xs text-muted-foreground">Pode criar atividades no timeline</p>
                    </div>
                    <Switch
                      checked={template.permissions?.can_create_activities}
                      onCheckedChange={(checked) => updateTemplate({
                        permissions: { ...template.permissions!, can_create_activities: checked }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Disparar Automações</Label>
                      <p className="text-xs text-muted-foreground">Pode ativar regras de automação</p>
                    </div>
                    <Switch
                      checked={template.permissions?.can_trigger_automations}
                      onCheckedChange={(checked) => updateTemplate({
                        permissions: { ...template.permissions!, can_trigger_automations: checked }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                <div>
                  <Label className="text-green-700 dark:text-green-300">Isolamento por Workspace</Label>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Obrigatório: dados são isolados por workspace
                  </p>
                </div>
                <Switch
                  checked={template.permissions?.workspace_isolation ?? true}
                  onCheckedChange={(checked) => updateTemplate({
                    permissions: { ...template.permissions!, workspace_isolation: checked }
                  })}
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRM Integration Tab */}
        <TabsContent value="crm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integração com CRM</CardTitle>
              <CardDescription>
                Defina como o módulo interage com as entidades do CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Entidades Afetadas</Label>
                <div className="flex flex-wrap gap-2">
                  {CRM_ENTITIES.map(entity => {
                    const isSelected = template.crm_integration?.entities_affected?.includes(entity.value);
                    return (
                      <Badge
                        key={entity.value}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const current = template.crm_integration?.entities_affected || [];
                          const updated = isSelected
                            ? current.filter(e => e !== entity.value)
                            : [...current, entity.value];
                          updateTemplate({
                            crm_integration: {
                              ...template.crm_integration!,
                              entities_affected: updated
                            }
                          });
                        }}
                      >
                        {entity.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Descrição das Capacidades</Label>
                <Textarea
                  value={template.capabilities_description || ""}
                  onChange={(e) => updateTemplate({ capabilities_description: e.target.value })}
                  placeholder="Ex: Cria leads qualificadas a partir de pesquisa online e sugere próxima ação."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Cria Dados</Label>
                  <Switch
                    checked={template.capabilities?.creates_data}
                    onCheckedChange={(checked) => updateTemplate({
                      capabilities: { ...template.capabilities!, creates_data: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Lê Dados</Label>
                  <Switch
                    checked={template.capabilities?.reads_data}
                    onCheckedChange={(checked) => updateTemplate({
                      capabilities: { ...template.capabilities!, reads_data: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Atualiza Dados</Label>
                  <Switch
                    checked={template.capabilities?.updates_data}
                    onCheckedChange={(checked) => updateTemplate({
                      capabilities: { ...template.capabilities!, updates_data: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Gera Insights</Label>
                  <Switch
                    checked={template.capabilities?.generates_insights}
                    onCheckedChange={(checked) => updateTemplate({
                      capabilities: { ...template.capabilities!, generates_insights: checked }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Monetização</CardTitle>
              <CardDescription>
                Configure o modelo de preços e consumo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modelo de Preços</Label>
                  <Select 
                    value={template.pricing?.type} 
                    onValueChange={(value: ModulePricingType) => updateTemplate({
                      pricing: { ...template.pricing!, type: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preço Base (€/mês)</Label>
                  <Input
                    type="number"
                    value={template.pricing?.base_price || 0}
                    onChange={(e) => updateTemplate({
                      pricing: { ...template.pricing!, base_price: Number(e.target.value), currency: "EUR" }
                    })}
                    min={0}
                  />
                </div>
              </div>

              {template.pricing?.type === "credits" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Créditos Incluídos</Label>
                    <Input
                      type="number"
                      value={template.pricing?.credits_included || 0}
                      onChange={(e) => updateTemplate({
                        pricing: { ...template.pricing!, credits_included: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço por Crédito Extra (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={template.pricing?.price_per_credit || 0}
                      onChange={(e) => updateTemplate({
                        pricing: { ...template.pricing!, price_per_credit: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              )}

              {template.pricing?.type === "usage_based" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Unidade de Consumo</Label>
                    <Input
                      value={template.pricing?.usage_unit || ""}
                      onChange={(e) => updateTemplate({
                        pricing: { ...template.pricing!, usage_unit: e.target.value }
                      })}
                      placeholder="Ex: email, enriquecimento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidades Incluídas</Label>
                    <Input
                      type="number"
                      value={template.pricing?.included_units || 0}
                      onChange={(e) => updateTemplate({
                        pricing: { ...template.pricing!, included_units: Number(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço por Unidade Extra (€)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={template.pricing?.price_per_unit || 0}
                      onChange={(e) => updateTemplate({
                        pricing: { ...template.pricing!, price_per_unit: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dias de Trial</Label>
                  <Input
                    type="number"
                    value={template.pricing?.trial_days || 0}
                    onChange={(e) => updateTemplate({
                      pricing: { ...template.pricing!, trial_days: Number(e.target.value) }
                    })}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Créditos de Trial</Label>
                  <Input
                    type="number"
                    value={template.pricing?.trial_credits || 0}
                    onChange={(e) => updateTemplate({
                      pricing: { ...template.pricing!, trial_credits: Number(e.target.value) }
                    })}
                    min={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UX Tab */}
        <TabsContent value="ux" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Experiência do Utilizador</CardTitle>
              <CardDescription>
                Defina onde e como o módulo aparece no CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Apresentação</Label>
                  <Select 
                    value={template.ux?.placement} 
                    onValueChange={(value: any) => updateTemplate({
                      ux: { ...template.ux!, placement: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone_page">Página Própria</SelectItem>
                      <SelectItem value="embed_panel">Painel Embebido</SelectItem>
                      <SelectItem value="contextual_action">Ação Contextual</SelectItem>
                      <SelectItem value="sidebar_widget">Widget Sidebar</SelectItem>
                      <SelectItem value="dashboard_widget">Widget Dashboard</SelectItem>
                      <SelectItem value="modal">Modal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Secção do Menu</Label>
                  <Select 
                    value={template.ux?.menu_section} 
                    onValueChange={(value: any) => updateTemplate({
                      ux: { ...template.ux!, menu_section: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospecting">Prospecção</SelectItem>
                      <SelectItem value="sales">Vendas</SelectItem>
                      <SelectItem value="service">Atendimento</SelectItem>
                      <SelectItem value="analytics">Análise</SelectItem>
                      <SelectItem value="tools">Ferramentas</SelectItem>
                      <SelectItem value="settings">Configurações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Label no Menu</Label>
                  <Input
                    value={template.ux?.menu_label || ""}
                    onChange={(e) => updateTemplate({
                      ux: { ...template.ux!, menu_label: e.target.value }
                    })}
                    placeholder="Ex: Nova Pesquisa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ícone do Menu</Label>
                  <Input
                    value={template.ux?.menu_icon || ""}
                    onChange={(e) => updateTemplate({
                      ux: { ...template.ux!, menu_icon: e.target.value }
                    })}
                    placeholder="Ex: Search (nome do Lucide icon)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de IA</CardTitle>
              <CardDescription>
                Se o módulo usa IA, configure as capacidades e comportamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Módulo usa IA</Label>
                  <p className="text-xs text-muted-foreground">Ativar funcionalidades de inteligência artificial</p>
                </div>
                <Switch
                  checked={template.ai?.uses_ai}
                  onCheckedChange={(checked) => updateTemplate({
                    ai: { 
                      ...template.ai!, 
                      uses_ai: checked,
                      capabilities: checked ? template.ai?.capabilities || [] : [],
                      execution_mode: template.ai?.execution_mode || "suggest_only",
                      requires_human_validation: true,
                      content_filtering: true,
                      pii_detection: true
                    }
                  })}
                />
              </div>

              {template.ai?.uses_ai && (
                <>
                  <div className="space-y-4">
                    <Label>Capacidades de IA</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "classify", label: "Classificar" },
                        { value: "suggest", label: "Sugerir" },
                        { value: "predict", label: "Prever" },
                        { value: "generate", label: "Gerar" },
                        { value: "analyze", label: "Analisar" },
                        { value: "summarize", label: "Resumir" },
                        { value: "translate", label: "Traduzir" }
                      ].map(cap => {
                        const isSelected = template.ai?.capabilities?.includes(cap.value as any);
                        return (
                          <Badge
                            key={cap.value}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const current = template.ai?.capabilities || [];
                              const updated = isSelected
                                ? current.filter(c => c !== cap.value)
                                : [...current, cap.value as any];
                              updateTemplate({
                                ai: { ...template.ai!, capabilities: updated }
                              });
                            }}
                          >
                            {cap.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Modo de Execução</Label>
                    <Select 
                      value={template.ai?.execution_mode} 
                      onValueChange={(value: any) => updateTemplate({
                        ai: { ...template.ai!, execution_mode: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suggest_only">Apenas Sugere (humano decide)</SelectItem>
                        <SelectItem value="auto_with_review">Auto com Revisão (humano revê)</SelectItem>
                        <SelectItem value="fully_automatic">Totalmente Automático (baixo risco apenas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>Regra:</strong> IA nunca executa ações comerciais sem validação humana.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* API Credentials Section */}
          <Card>
            <CardHeader>
              <CardTitle>Credenciais de API</CardTitle>
              <CardDescription>
                Configure as chaves de API necessárias para o módulo funcionar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Nota:</strong> Estas credenciais serão solicitadas ao cliente quando ativar o módulo e guardadas de forma segura.
                </p>
              </div>
              
              {/* Add API Key fields */}
              {(template.settings_schema?.settings || []).filter(s => s.key.includes('api_key') || s.key.includes('API_KEY')).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Nenhuma credencial configurada</p>
                </div>
              )}
              
              {(template.settings_schema?.settings || []).filter(s => s.key.includes('api_key') || s.key.includes('API_KEY')).map((setting, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>{setting.label}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newSettings = (template.settings_schema?.settings || []).filter(s => s.key !== setting.key);
                      updateTemplate({
                        settings_schema: {
                          ...template.settings_schema!,
                          settings: newSettings
                        }
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Separator />
              
              <div className="space-y-4">
                <Label>Adicionar Credencial</Label>
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    id="new_api_key_name"
                    placeholder="Nome (ex: SERPAPI_API_KEY)"
                  />
                  <Input
                    id="new_api_key_label"
                    placeholder="Label (ex: SerpAPI Key)"
                  />
                  <Button 
                    type="button"
                    onClick={() => {
                      const nameInput = document.getElementById('new_api_key_name') as HTMLInputElement;
                      const labelInput = document.getElementById('new_api_key_label') as HTMLInputElement;
                      const keyName = nameInput?.value?.trim();
                      const keyLabel = labelInput?.value?.trim();
                      
                      if (keyName && keyLabel) {
                        const newSetting = {
                          key: keyName,
                          label: keyLabel,
                          description: `Chave de API para ${keyLabel}`,
                          type: "text" as const,
                          default_value: "",
                          required: true,
                          visible_to_admin_only: true
                        };
                        updateTemplate({
                          settings_schema: {
                            ...template.settings_schema,
                            settings: [...(template.settings_schema?.settings || []), newSetting]
                          }
                        });
                        nameInput.value = "";
                        labelInput.value = "";
                        toast.success(`Credencial ${keyLabel} adicionada`);
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs & Governança</CardTitle>
              <CardDescription>
                Configure o que é registado e alertas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: "log_actions", label: "Log de Ações", desc: "Registar ações executadas" },
                  { key: "log_data_changes", label: "Log de Alterações", desc: "Registar dados criados/alterados" },
                  { key: "log_api_calls", label: "Log de API", desc: "Registar chamadas a APIs" },
                  { key: "log_errors", label: "Log de Erros", desc: "Registar erros e exceções" },
                  { key: "log_usage", label: "Log de Consumo", desc: "Registar uso de créditos" },
                  { key: "alert_on_error", label: "Alertas de Erro", desc: "Notificar admin em erros" }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={(template.logs as any)?.[item.key] ?? true}
                      onCheckedChange={(checked) => updateTemplate({
                        logs: { ...template.logs!, [item.key]: checked }
                      })}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Retenção de Logs (dias)</Label>
                <Input
                  type="number"
                  value={template.logs?.retention_days || 90}
                  onChange={(e) => updateTemplate({
                    logs: { ...template.logs!, retention_days: Number(e.target.value) }
                  })}
                  min={7}
                  max={365}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comportamento de Ativação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Regra:</strong> Desativar nunca apaga dados históricos.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Executar Setup ao Ativar</Label>
                  <Switch
                    checked={template.activation?.on_activate?.runs_setup ?? true}
                    onCheckedChange={(checked) => updateTemplate({
                      activation: { 
                        ...template.activation!, 
                        on_activate: { ...template.activation?.on_activate!, runs_setup: checked }
                      }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Permitir Reativação</Label>
                  <Switch
                    checked={template.activation?.allows_reactivation ?? true}
                    onCheckedChange={(checked) => updateTemplate({
                      activation: { ...template.activation!, allows_reactivation: checked }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-6">
          <ModuleChecklist template={template} validation={validation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
