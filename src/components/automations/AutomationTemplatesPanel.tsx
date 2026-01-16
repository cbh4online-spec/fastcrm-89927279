import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Target,
  Clock,
  CreditCard,
  CheckCircle,
  RefreshCw,
  Zap,
  Search,
  Star,
  Sparkles,
  Play,
  Settings,
  Info,
  AlertTriangle,
  MessageSquare,
  GraduationCap,
  Stethoscope,
  FileSearch,
  Bell,
} from "lucide-react";
import { AutomationTemplate } from "@/types/automationWorkflows";
import {
  AUTOMATION_TEMPLATES,
  TEMPLATE_CATEGORIES,
  INDUSTRY_OPTIONS,
  getTemplatesByIndustry,
  getTemplatesByCategory,
  getPopularTemplates,
  getNewTemplates,
} from "@/data/automationTemplates";
import { IndustryType } from "@/types/automationWorkflows";
import { useCreateAutomationRule } from "@/hooks/useAutomations";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus,
  Target,
  Clock,
  CreditCard,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  GraduationCap,
  Stethoscope,
  FileSearch,
  Bell,
  Zap,
};

interface Props {
  onEditRule?: (ruleId: string) => void;
}

export function AutomationTemplatesPanel({ onEditRule }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const createRule = useCreateAutomationRule();

  const getFilteredTemplates = (): AutomationTemplate[] => {
    let templates: AutomationTemplate[];
    
    if (activeCategory === "all") {
      templates = getTemplatesByIndustry(selectedIndustry);
    } else if (activeCategory === "popular") {
      templates = getPopularTemplates(20);
    } else if (activeCategory === "new") {
      templates = getNewTemplates();
    } else {
      templates = getTemplatesByCategory(activeCategory as AutomationTemplate["category"]);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    return templates;
  };

  const handleInstallClick = (template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setInstallDialogOpen(true);
  };

  const handleInstallConfirm = async () => {
    if (!selectedTemplate) return;

    setIsInstalling(true);
    try {
      await createRule.mutateAsync({
        name: selectedTemplate.name,
        description: `${selectedTemplate.description} [template:${selectedTemplate.id}]`,
        trigger: selectedTemplate.trigger as any,
        is_active: false,
        conditions: selectedTemplate.conditions.map((c, i) => ({
          field_name: c.field_name,
          operator: c.operator as any,
          value: c.value,
          position: i,
        })),
        actions: selectedTemplate.actions.map((a, i) => ({
          action_type: a.action_type as any,
          config: a.config,
          position: i,
        })),
      });

      toast.success(`Template "${selectedTemplate.name}" instalado!`, {
        description: "O template está desativado. Ative nas regras quando pronto.",
      });
      setInstallDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao instalar template");
    } finally {
      setIsInstalling(false);
    }
  };

  const filteredTemplates = getFilteredTemplates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Templates de Automação por Indústria</p>
            <p className="text-xs text-muted-foreground">
              Templates pré-configurados adaptados ao seu tipo de negócio. 
              Instale e personalize conforme necessário.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar templates..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedIndustry} onValueChange={(v) => setSelectedIndustry(v as IndustryType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Indústria" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRY_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="popular">
            <Star className="h-3 w-3 mr-1" />
            Populares
          </TabsTrigger>
          <TabsTrigger value="new">
            <Sparkles className="h-3 w-3 mr-1" />
            Novos
          </TabsTrigger>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum template encontrado.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onInstall={handleInstallClick}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Install Dialog */}
      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar Template</DialogTitle>
            <DialogDescription>
              Vais instalar "{selectedTemplate?.name}". A automação será criada
              <strong> desativada por defeito</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Gatilho:</span>
                  <span>{selectedTemplate.trigger}</span>
                </div>
                
                {selectedTemplate.conditions.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Condições:</span>
                    <ul className="mt-1 ml-6 list-disc text-muted-foreground">
                      {selectedTemplate.conditions.map((c, i) => (
                        <li key={i}>
                          {c.field_name} {c.operator} {c.value || "(vazio)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium">Ações ({selectedTemplate.actions.length}):</span>
                  <ul className="mt-1 ml-6 list-disc text-muted-foreground">
                    {selectedTemplate.actions.map((a, i) => (
                      <li key={i}>{a.action_type}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">O template será instalado desativado.</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInstallConfirm} disabled={isInstalling}>
              {isInstalling ? "A instalar..." : "Instalar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateCardProps {
  template: AutomationTemplate;
  onInstall: (template: AutomationTemplate) => void;
}

function TemplateCard({ template, onInstall }: TemplateCardProps) {
  const Icon = ICON_MAP[template.icon] || Zap;

  return (
    <Card className="relative transition-all hover:shadow-md">
      {template.isNew && (
        <Badge className="absolute -top-2 -right-2 bg-primary">
          <Sparkles className="h-3 w-3 mr-1" />
          Novo
        </Badge>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${template.color} text-white`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">{template.name}</CardTitle>
            <div className="flex flex-wrap gap-1 mt-1">
              {template.industry.slice(0, 2).map((ind) => (
                <Badge key={ind} variant="outline" className="text-xs">
                  {INDUSTRY_OPTIONS.find(i => i.id === ind)?.label || ind}
                </Badge>
              ))}
              {template.industry.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{template.industry.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm line-clamp-2">
          {template.description}
        </CardDescription>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span>Gatilho: <span className="text-foreground">{template.trigger}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="h-3 w-3" />
            <span>{template.actions.length} ação(ões)</span>
          </div>
          {template.conditions.length > 0 && (
            <div className="flex items-center gap-2">
              <Settings className="h-3 w-3" />
              <span>{template.conditions.length} condição(ões)</span>
            </div>
          )}
        </div>

        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={() => onInstall(template)}
        >
          <Zap className="h-4 w-4 mr-1" />
          Instalar Template
        </Button>
      </CardContent>
    </Card>
  );
}
