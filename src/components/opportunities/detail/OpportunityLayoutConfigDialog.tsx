import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Layers, User, Building2, FileText, DollarSign, MessageSquare, Briefcase, UserCheck, ListChecks, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_HIGHLIGHTS,
  DEFAULT_SIDEBAR_ORDER,
  useUpdateOpportunityLayoutPreferences,
} from "@/hooks/useOpportunityLayoutPreferences";
import { cn } from "@/lib/utils";

interface OpportunityLayoutConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHighlights: string[];
  currentHighlightsOrder: string[];
  currentSidebarOrder: string[];
}

const HIGHLIGHT_CARDS_META = [
  { id: 'stage', icon: Layers, labelKey: 'oppLayout_dealStage' },
  { id: 'owner', icon: User, labelKey: 'oppLayout_dealOwner' },
  { id: 'company', icon: Building2, labelKey: 'oppLayout_associatedCompany' },
  { id: 'documents', icon: FileText, labelKey: 'oppLayout_documents' },
  { id: 'value', icon: DollarSign, labelKey: 'oppLayout_dealValue' },
];

const SIDEBAR_SECTIONS_META = [
  { id: 'communication', icon: MessageSquare, labelKey: 'oppDetail_communication' },
  { id: 'dealInfo', icon: Briefcase, labelKey: 'oppDetail_dealInfo' },
  { id: 'associations', icon: UserCheck, labelKey: 'oppDetail_associations' },
  { id: 'companyInfo', icon: Building2, labelKey: 'oppDetail_companyInfo' },
  { id: 'lists', icon: ListChecks, labelKey: 'oppDetail_listsSection' },
  { id: 'intelligence', icon: Brain, labelKey: 'oppLayout_intelligence' },
];

function DraggableItem({
  id, icon: Icon, label, checked, onCheckedChange, onDragStart, onDragOver, onDrop, isDragOver,
}: {
  id: string; icon: any; label: string; checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md border border-border/50 bg-card cursor-grab active:cursor-grabbing transition-all",
        isDragOver && "border-primary/50 bg-primary/5"
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function OpportunityLayoutConfigDialog({
  open, onOpenChange, currentHighlights, currentHighlightsOrder, currentSidebarOrder,
}: OpportunityLayoutConfigDialogProps) {
  const { t } = useTranslation("crm");
  const updatePrefs = useUpdateOpportunityLayoutPreferences();

  const [visibleHighlights, setVisibleHighlights] = useState<string[]>(currentHighlights);
  const [highlightsOrder, setHighlightsOrder] = useState<string[]>(currentHighlightsOrder);
  const [sidebarOrder, setSidebarOrder] = useState<string[]>(currentSidebarOrder);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    setDragItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleReorder = useCallback((list: string[], setList: (l: string[]) => void) => {
    return {
      onDragOver: (targetId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverItem(targetId);
      },
      onDrop: (targetId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        if (!dragItem || dragItem === targetId) { setDragOverItem(null); return; }
        const newList = [...list];
        const fromIdx = newList.indexOf(dragItem);
        const toIdx = newList.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) { setDragOverItem(null); return; }
        newList.splice(fromIdx, 1);
        newList.splice(toIdx, 0, dragItem);
        setList(newList);
        setDragItem(null);
        setDragOverItem(null);
      },
    };
  }, [dragItem]);

  const highlightsDnd = handleReorder(highlightsOrder, setHighlightsOrder);
  const sidebarDnd = handleReorder(sidebarOrder, setSidebarOrder);

  const toggleHighlight = (id: string, checked: boolean) => {
    setVisibleHighlights(prev => checked ? [...prev, id] : prev.filter(h => h !== id));
  };

  const handleSave = async () => {
    await updatePrefs.mutateAsync({
      visible_highlights: visibleHighlights,
      highlights_order: highlightsOrder,
      sidebar_order: sidebarOrder,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    setVisibleHighlights([...DEFAULT_HIGHLIGHTS]);
    setHighlightsOrder([...DEFAULT_HIGHLIGHTS]);
    setSidebarOrder([...DEFAULT_SIDEBAR_ORDER]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{t("oppLayout_configureLayout")}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{t("oppLayout_dragToReorder")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="highlights" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="highlights" className="flex-1 text-xs">{t("oppLayout_highlights")}</TabsTrigger>
            <TabsTrigger value="sidebar" className="flex-1 text-xs">{t("oppLayout_sidebar")}</TabsTrigger>
          </TabsList>

          <TabsContent value="highlights" className="space-y-2 mt-3 max-h-[300px] overflow-y-auto">
            {highlightsOrder.map(id => {
              const meta = HIGHLIGHT_CARDS_META.find(m => m.id === id);
              if (!meta) return null;
              return (
                <DraggableItem
                  key={id}
                  id={id}
                  icon={meta.icon}
                  label={t(meta.labelKey)}
                  checked={visibleHighlights.includes(id)}
                  onCheckedChange={(checked) => toggleHighlight(id, !!checked)}
                  onDragStart={handleDragStart(id)}
                  onDragOver={highlightsDnd.onDragOver(id)}
                  onDrop={highlightsDnd.onDrop(id)}
                  isDragOver={dragOverItem === id}
                />
              );
            })}
          </TabsContent>

          <TabsContent value="sidebar" className="space-y-2 mt-3 max-h-[300px] overflow-y-auto">
            {sidebarOrder.map(id => {
              const meta = SIDEBAR_SECTIONS_META.find(m => m.id === id);
              if (!meta) return null;
              return (
                <DraggableItem
                  key={id}
                  id={id}
                  icon={meta.icon}
                  label={t(meta.labelKey)}
                  checked={true}
                  onCheckedChange={() => {}}
                  onDragStart={handleDragStart(id)}
                  onDragOver={sidebarDnd.onDragOver(id)}
                  onDrop={sidebarDnd.onDrop(id)}
                  isDragOver={dragOverItem === id}
                />
              );
            })}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
            {t("oppLayout_resetDefaults")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updatePrefs.isPending} className="text-xs">
            {updatePrefs.isPending ? "..." : t("oppLayout_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
