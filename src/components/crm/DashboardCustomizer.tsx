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
import {
  GripVertical,
  Settings2,
  RotateCcw,
  Sparkles,
  Loader2,
  MessageSquare,
  Clock,
  CheckSquare,
  TrendingUp,
  Calendar,
  Megaphone,
  Share2,
  DollarSign,
  AlertTriangle,
  Save,
  User,
  Building2,
} from "lucide-react";
import {
  WidgetConfig,
  WidgetType,
  WIDGET_DEFINITIONS,
  DEFAULT_WIDGETS,
  MAX_VISIBLE_WIDGETS,
  useSaveDashboardLayout,
  useDeleteUserLayout,
  generateSuggestedLayout,
} from "@/hooks/useDashboardLayout";
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

interface DashboardCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "lead" | "contact";
  entityId: string | undefined;
  currentLayout: WidgetConfig[];
  layoutSource: "user" | "workspace" | "default";
  isAdmin: boolean;
}

export function DashboardCustomizer({
  open,
  onOpenChange,
  entityType,
  entityId,
  currentLayout,
  layoutSource,
  isAdmin,
}: DashboardCustomizerProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saveScope, setSaveScope] = useState<"user" | "workspace">("user");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [suggestedLayout, setSuggestedLayout] = useState<WidgetConfig[] | null>(null);

  const saveLayout = useSaveDashboardLayout();
  const deleteUserLayout = useDeleteUserLayout();
  const { data: kpis } = useEntityKPIs(entityType, entityId);

  useEffect(() => {
    if (open) {
      setWidgets([...currentLayout].sort((a, b) => a.position - b.position));
      setSaveScope(isAdmin ? "workspace" : "user");
    }
  }, [open, currentLayout, isAdmin]);

  const enabledCount = widgets.filter(w => w.enabled).length;
  const hasChanges = JSON.stringify(widgets) !== JSON.stringify(currentLayout);

  const handleToggleWidget = (widgetId: string) => {
    setWidgets(prev => {
      const updated = prev.map(w => {
        if (w.id === widgetId) {
          // Check max limit when enabling
          if (!w.enabled && enabledCount >= MAX_VISIBLE_WIDGETS) {
            return w;
          }
          return { ...w, enabled: !w.enabled };
        }
        return w;
      });
      return updated;
    });
  };

  const handleSettingChange = (widgetId: string, key: string, value: unknown) => {
    setWidgets(prev =>
      prev.map(w =>
        w.id === widgetId
          ? { ...w, settings: { ...w.settings, [key]: value } }
          : w
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setWidgets(prev => {
      const newWidgets = [...prev];
      const [removed] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(index, 0, removed);
      
      // Update positions
      return newWidgets.map((w, i) => ({ ...w, position: i }));
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    await saveLayout.mutateAsync({
      entityType,
      layout: widgets,
      scope: saveScope,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    setWidgets([...DEFAULT_WIDGETS]);
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
      setWidgets(suggestedLayout);
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
              Personalizar Dashboard
            </DialogTitle>
            <DialogDescription>
              Configure quais widgets aparecem e a sua ordem. Máximo de {MAX_VISIBLE_WIDGETS} widgets ativos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Badge variant={enabledCount > MAX_VISIBLE_WIDGETS - 2 ? "destructive" : "secondary"}>
                {enabledCount}/{MAX_VISIBLE_WIDGETS} ativos
              </Badge>
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

          <Separator />

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 py-4">
              {widgets.map((widget, index) => {
                const definition = WIDGET_DEFINITIONS[widget.type];
                const isAtLimit = !widget.enabled && enabledCount >= MAX_VISIBLE_WIDGETS;

                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
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
                      <p className="text-xs text-muted-foreground truncate">
                        {definition.description}
                      </p>
                    </div>

                    {/* Time window setting */}
                    {definition.hasTimeWindow && widget.enabled && (
                      <Select
                        value={String(widget.settings.timeWindow || 30)}
                        onValueChange={(v) => handleSettingChange(widget.id, "timeWindow", Number(v))}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {definition.timeWindowOptions?.map((days) => (
                            <SelectItem key={days} value={String(days)}>
                              {days} dias
                            </SelectItem>
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
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveLayout.isPending}
            >
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
              Isto irá repor todos os widgets para a configuração original. As alterações não guardadas serão perdidas.
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
              a IA sugere o seguinte layout optimizado:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {suggestedLayout && (
            <div className="space-y-2 py-4">
              {suggestedLayout
                .filter(w => w.enabled)
                .slice(0, 6)
                .map((widget, index) => (
                  <div
                    key={widget.id}
                    className="flex items-center gap-2 p-2 rounded bg-muted/50"
                  >
                    <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    {WIDGET_ICONS[widget.type]}
                    <span className="text-sm">{WIDGET_DEFINITIONS[widget.type].label}</span>
                  </div>
                ))}
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
