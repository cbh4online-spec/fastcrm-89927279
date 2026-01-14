import { CrmSavedView } from "@/hooks/useCrmViews";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Check, 
  Star, 
  Trash2, 
  Users, 
  Kanban, 
  Table2, 
  LayoutGrid,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  views: CrmSavedView[];
  selectedViewId: string | null;
  onSelectView: (viewId: string) => void;
  onSetDefault: (viewId: string) => void;
  onDeleteView: (viewId: string) => void;
}

export function ViewSelectorPopover({
  open,
  onOpenChange,
  views,
  selectedViewId,
  onSelectView,
  onSetDefault,
  onDeleteView,
}: ViewSelectorPopoverProps) {
  const contactViews = views.filter(v => v.entity_type === "contacts");
  const opportunityViews = views.filter(v => v.entity_type === "opportunities");

  const renderViewItem = (view: CrmSavedView) => {
    const isSelected = view.id === selectedViewId;
    const isWorkspaceView = view.user_id === null;

    return (
      <div
        key={view.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
          isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
        )}
        onClick={() => {
          onSelectView(view.id);
          onOpenChange(false);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{view.name}</span>
            {view.is_default && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            )}
            {isWorkspaceView && (
              <Building2 className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {view.view_mode === "table" ? (
                <><Table2 className="w-3 h-3 mr-1" /> Tabela</>
              ) : (
                <><LayoutGrid className="w-3 h-3 mr-1" /> Quadro</>
              )}
            </Badge>
            {view.for_role && (
              <Badge variant="secondary" className="text-xs capitalize">
                {view.for_role}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSelected && <Check className="w-4 h-4 text-primary" />}
          {!view.is_default && !isWorkspaceView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault(view.id);
              }}
            >
              <Star className="w-4 h-4" />
            </Button>
          )}
          {!isWorkspaceView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteView(view.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Vistas Guardadas</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {contactViews.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Contactos</span>
                </div>
                <div className="space-y-1">
                  {contactViews.map(renderViewItem)}
                </div>
              </div>
            )}

            {opportunityViews.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Kanban className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Oportunidades</span>
                </div>
                <div className="space-y-1">
                  {opportunityViews.map(renderViewItem)}
                </div>
              </div>
            )}

            {views.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Ainda não tem vistas guardadas</p>
                <p className="text-sm mt-1">Personalize a vista e clique em "Nova Vista" para guardar</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
