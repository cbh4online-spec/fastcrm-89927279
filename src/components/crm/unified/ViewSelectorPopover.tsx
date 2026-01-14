import { CrmSavedView } from "@/hooks/useCrmViews";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Check, 
  Star, 
  Trash2, 
  Users, 
  TrendingUp, 
  Table2, 
  LayoutGrid,
  Building2,
  Bookmark,
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
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
          isSelected 
            ? "bg-primary/10 border border-primary/30 shadow-sm" 
            : "hover:bg-muted border border-transparent"
        )}
        onClick={() => {
          onSelectView(view.id);
          onOpenChange(false);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-medium truncate", isSelected && "text-primary")}>
              {view.name}
            </span>
            {view.is_default && (
              <Tooltip>
                <TooltipTrigger>
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                </TooltipTrigger>
                <TooltipContent>Vista padrão</TooltipContent>
              </Tooltip>
            )}
            {isWorkspaceView && (
              <Tooltip>
                <TooltipTrigger>
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Vista partilhada com a equipa</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-xs gap-1">
              {view.view_mode === "table" ? (
                <><Table2 className="w-3 h-3" /> Lista</>
              ) : (
                <><LayoutGrid className="w-3 h-3" /> Quadro</>
              )}
            </Badge>
            {view.for_role && (
              <Badge variant="secondary" className="text-xs capitalize">
                {view.for_role === "owner" ? "Proprietário" :
                 view.for_role === "admin" ? "Administrador" :
                 view.for_role === "agent" ? "Agente" : "Visualizador"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSelected && <Check className="w-4 h-4 text-primary" />}
          {!view.is_default && !isWorkspaceView && (
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>Definir como vista inicial</TooltipContent>
            </Tooltip>
          )}
          {!isWorkspaceView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteView(view.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar vista</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>As minhas vistas</DialogTitle>
              <DialogDescription>
                Selecione uma vista guardada ou continue a personalizar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-6">
            {contactViews.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Contactos</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {contactViews.length}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {contactViews.map(renderViewItem)}
                </div>
              </div>
            )}

            {opportunityViews.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Negócios</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {opportunityViews.length}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {opportunityViews.map(renderViewItem)}
                </div>
              </div>
            )}

            {views.length === 0 && (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Ainda sem vistas guardadas</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Personalize os filtros e colunas, depois clique em "Guardar como nova" para criar a sua primeira vista
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
