import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  GripVertical,
  Settings2,
  RotateCcw,
  Sparkles,
  Loader2,
  MessageSquare,
  Clock,
  CheckSquare,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Megaphone,
  Share2,
  DollarSign,
  AlertTriangle,
  Save,
  User,
  Building2,
  FileText,
  Mail,
  Paperclip,
  LayoutDashboard,
  PanelLeft,
  Activity,
} from "lucide-react";
import {
  WidgetConfig,
  WidgetType,
  SidebarModuleConfig,
  SidebarModuleType,
  LayoutConfig,
  WIDGET_DEFINITIONS,
  SIDEBAR_MODULE_DEFINITIONS,
  DEFAULT_WIDGETS,
  DEFAULT_SIDEBAR_MODULES,
  MAX_VISIBLE_WIDGETS,
  MAX_SIDEBAR_MODULES,
  useSaveLayoutConfig,
  useDeleteUserLayoutConfig,
  generateSuggestedLayout,
} from "@/hooks/useLayoutConfig";
import { useEntityKPIs } from "@/hooks/useEntityInsights";
import { cn } from "@/lib/utils";

const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  messages_count: <MessageSquare className="w-4 h-4" />,
  last_interaction: <Clock className="w-4 h-4" />,
  open_activities: <CheckSquare className="w-4 h-4" />,
  opportunities: <TrendingUp className="w-4 h-4" />,
  meetings: <Calendar className="w-4 h-4" />,
  campaigns: <Megaphone className="w-4 h-4" />,
  social_interactions: <Share2 className="w-4 h-4" />,
  payments: <DollarSign className="w-4 h-4" />,
  ai_insights: <Sparkles className="w-4 h-4" />,
};

const SIDEBAR_ICONS: Record<SidebarModuleType, React.ReactNode> = {
  overview: <User className="w-4 h-4" />,
  notes: <FileText className="w-4 h-4" />,
  messages: <MessageSquare className="w-4 h-4" />,
  open_activities: <CheckSquare className="w-4 h-4" />,
  closed_activities: <CheckCircle2 className="w-4 h-4" />,
  meetings: <Calendar className="w-4 h-4" />,
  opportunities: <TrendingUp className="w-4 h-4" />,
  campaigns: <Megaphone className="w-4 h-4" />,
  emails: <Mail className="w-4 h-4" />,
  social: <Share2 className="w-4 h-4" />,
  payments: <DollarSign className="w-4 h-4" />,
  files: <Paperclip className="w-4 h-4" />,
  activity_timeline: <Activity className="w-4 h-4" />,
};

interface UnifiedLayoutCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "lead" | "contact";
  entityId: string | undefined;
  currentLayout: LayoutConfig;
  layoutSource: "user" | "workspace" | "default";
  isAdmin: boolean;
}

export function UnifiedLayoutCustomizer({
  open,
  onOpenChange,
  entityType,
  entityId,
  currentLayout,
  layoutSource,
  isAdmin,
}: UnifiedLayoutCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "sidebar">("dashboard");
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [sidebarModules, setSidebarModules] = useState<SidebarModuleConfig[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saveScope, setSaveScope] = useState<"user" | "workspace">("user");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [suggestedLayout, setSuggestedLayout] = useState<LayoutConfig | null>(null);

  const saveLayout = useSaveLayoutConfig();
  const deleteUserLayout = useDeleteUserLayoutConfig();
  const { data: kpis } = useEntityKPIs(entityType, entityId);

  useEffect(() => {
    if (open) {
      setWidgets([...currentLayout.widgets].sort((a, b) => a.position - b.position));
      setSidebarModules([...currentLayout.sidebar].sort((a, b) => a.position - b.position));
      setSaveScope(isAdmin ? "workspace" : "user");
    }
  }, [open, currentLayout, isAdmin]);

  const enabledWidgetCount = widgets.filter(w => w.enabled).length;
  const enabledModuleCount = sidebarModules.filter(m => m.enabled).length;
  
  const hasChanges = 
    JSON.stringify(widgets) !== JSON.stringify(currentLayout.widgets) ||
    JSON.stringify(sidebarModules) !== JSON.stringify(currentLayout.sidebar);

  // Widget handlers
  const handleToggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(w => {
      if (w.id === widgetId) {
        if (!w.enabled && enabledWidgetCount >= MAX_VISIBLE_WIDGETS) return w;
        return { ...w, enabled: !w.enabled };
      }
      return w;
    }));
  };

  const handleWidgetSettingChange = (widgetId: string, key: string, value: unknown) => {
    setWidgets(prev => prev.map(w =>
      w.id === widgetId ? { ...w, settings: { ...w.settings, [key]: value } } : w
    ));
  };

  // Sidebar handlers
  const handleToggleModule = (moduleId: string) => {
    setSidebarModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        if (!m.enabled && enabledModuleCount >= MAX_SIDEBAR_MODULES) return m;
        return { ...m, enabled: !m.enabled };
      }
      return m;
    }));
  };

  const handleModuleSettingChange = (moduleId: string, key: string, value: boolean) => {
    setSidebarModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, settings: { ...m.settings, [key]: value } } : m
    ));
  };

  // Drag handlers for widgets
  const handleWidgetDragStart = (index: number) => setDraggedIndex(index);

  const handleWidgetDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [removed] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(index, 0, removed);
      return newWidgets.map((w, i) => ({ ...w, position: i }));
    });
    setDraggedIndex(index);
  };

  // Drag handlers for sidebar modules
  const handleModuleDragStart = (index: number) => setDraggedIndex(index);

  const handleModuleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setSidebarModules(prev => {
      const newModules = [...prev];
      const [removed] = newModules.splice(draggedIndex, 1);
      newModules.splice(index, 0, removed);
      return newModules.map((m, i) => ({ ...m, position: i }));
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const handleSave = async () => {
    await saveLayout.mutateAsync({
      entityType,
      layout: { widgets, sidebar: sidebarModules },
      scope: saveScope,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    setWidgets([...DEFAULT_WIDGETS]);
    setSidebarModules([...DEFAULT_SIDEBAR_MODULES]);
    setShowResetConfirm(false);
  };

  const handleResetToWorkspace = async () => {
    await deleteUserLayout.mutateAsync(entityType);
    onOpenChange(false);
  };

  const handleGenerateAISuggestion = () => {
    if (kpis) {
      const suggested = generateSuggestedLayout({
        messagesCount: kpis.messagesCount,
        opportunitiesCount: kpis.opportunitiesCount,
        openActivitiesCount: kpis.openActivitiesCount,
        meetingsHeld: kpis.meetingsHeld,
        paymentsCount: kpis.paymentsCount,
      });
      setSuggestedLayout(suggested);
      setShowAISuggestion(true);
    }
  };

  const handleApplyAISuggestion = () => {
    if (suggestedLayout) {
      setWidgets(suggestedLayout.widgets);
      setSidebarModules(suggestedLayout.sidebar);
      setShowAISuggestion(false);
      setSuggestedLayout(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Personalizar Layout
            </DialogTitle>
            <DialogDescription>
              Configure o dashboard e a barra lateral para {entityType === "lead" ? "leads" : "contactos"}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              {layoutSource !== "default" && (
                <Badge variant="outline" className="text-xs">
                  {layoutSource === "user" ? (
                    <>
                      <User className="w-3 h-3 mr-1" />
                      Personalizado
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3 h-3 mr-1" />
                      Workspace
                    </>
                  )}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAISuggestion}
                disabled={!kpis}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Sugestão IA
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Restaurar
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "dashboard" | "sidebar")} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
                <Badge variant="secondary" className="ml-1 h-5 text-xs">
                  {enabledWidgetCount}/{MAX_VISIBLE_WIDGETS}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sidebar" className="flex items-center gap-2">
                <PanelLeft className="w-4 h-4" />
                Barra Lateral
                <Badge variant="secondary" className="ml-1 h-5 text-xs">
                  {enabledModuleCount}/{MAX_SIDEBAR_MODULES}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[350px] -mx-6 px-6">
                <div className="space-y-2 py-2">
                  {widgets.map((widget, index) => {
                    const definition = WIDGET_DEFINITIONS[widget.type];
                    const isAtLimit = !widget.enabled && enabledWidgetCount >= MAX_VISIBLE_WIDGETS;

                    return (
                      <div
                        key={widget.id}
                        draggable
                        onDragStart={() => handleWidgetDragStart(index)}
                        onDragOver={(e) => handleWidgetDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          widget.enabled
                            ? "bg-primary/5 border-primary/20"
                            : "bg-muted/30 border-border/50",
                          draggedIndex === index && "opacity-50 border-primary",
                          "hover:border-primary/40 cursor-grab active:cursor-grabbing"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className={cn("p-2 rounded-md", widget.enabled ? "bg-primary/10" : "bg-muted")}>
                          {WIDGET_ICONS[widget.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{definition.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{definition.description}</p>
                        </div>
                        {definition.hasTimeWindow && widget.enabled && (
                          <Select
                            value={String(widget.settings.timeWindow || 30)}
                            onValueChange={(v) => handleWidgetSettingChange(widget.id, "timeWindow", Number(v))}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {definition.timeWindowOptions?.map((days) => (
                                <SelectItem key={days} value={String(days)}>{days} dias</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => handleToggleWidget(widget.id)}
                          disabled={isAtLimit}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sidebar" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-[350px] -mx-6 px-6">
                <div className="space-y-2 py-2">
                  {sidebarModules.map((module, index) => {
                    const definition = SIDEBAR_MODULE_DEFINITIONS[module.type];
                    const isAtLimit = !module.enabled && enabledModuleCount >= MAX_SIDEBAR_MODULES;

                    return (
                      <div
                        key={module.id}
                        draggable
                        onDragStart={() => handleModuleDragStart(index)}
                        onDragOver={(e) => handleModuleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          module.enabled
                            ? "bg-primary/5 border-primary/20"
                            : "bg-muted/30 border-border/50",
                          draggedIndex === index && "opacity-50 border-primary",
                          "hover:border-primary/40 cursor-grab active:cursor-grabbing"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className={cn("p-2 rounded-md", module.enabled ? "bg-primary/10" : "bg-muted")}>
                          {SIDEBAR_ICONS[module.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{definition.label}</p>
                            {definition.isCore && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">Core</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{definition.description}</p>
                        </div>
                        {module.enabled && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`hide-empty-${module.id}`}
                              checked={module.settings.hide_if_empty || false}
                              onCheckedChange={(checked) => 
                                handleModuleSettingChange(module.id, "hide_if_empty", checked === true)
                              }
                            />
                            <Label 
                              htmlFor={`hide-empty-${module.id}`} 
                              className="text-xs text-muted-foreground whitespace-nowrap"
                            >
                              Ocultar se vazio
                            </Label>
                          </div>
                        )}
                        <Switch
                          checked={module.enabled}
                          onCheckedChange={() => handleToggleModule(module.id)}
                          disabled={isAtLimit}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <Separator />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {layoutSource === "user" && (
              <Button
                variant="ghost"
                onClick={handleResetToWorkspace}
                disabled={deleteUserLayout.isPending}
                className="sm:mr-auto"
              >
                Usar configuração do workspace
              </Button>
            )}

            {isAdmin && (
              <div className="flex items-center gap-2 sm:mr-auto">
                <span className="text-sm text-muted-foreground">Guardar como:</span>
                <Select value={saveScope} onValueChange={(v) => setSaveScope(v as "user" | "workspace")}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Pessoal</SelectItem>
                    <SelectItem value="workspace">Workspace (default)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saveLayout.isPending}>
              {saveLayout.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar configuração padrão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá repor o dashboard e a barra lateral para a configuração original. As alterações não guardadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Suggestion dialog */}
      <AlertDialog open={showAISuggestion} onOpenChange={setShowAISuggestion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Sugestão de Layout IA
            </AlertDialogTitle>
            <AlertDialogDescription>
              Com base na atividade deste {entityType === "lead" ? "lead" : "contacto"}, 
              a IA sugere um layout optimizado para dashboard e sidebar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {suggestedLayout && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Dashboard</h4>
                <div className="space-y-1">
                  {suggestedLayout.widgets
                    .filter(w => w.enabled)
                    .slice(0, 6)
                    .map((widget, index) => (
                      <div key={widget.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                        <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        {WIDGET_ICONS[widget.type]}
                        <span className="text-sm">{WIDGET_DEFINITIONS[widget.type].label}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">
              A sugestão não será aplicada automaticamente. Reveja e confirme antes de guardar.
            </span>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyAISuggestion}>
              Aplicar Sugestão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
