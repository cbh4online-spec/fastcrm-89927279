import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedViews, useCreateSavedView, useDeleteSavedView, SavedView } from "@/hooks/useSavedViews";
import { LayoutGrid, ChevronDown, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AttioViewSelectorProps {
  currentViewId?: string | null;
  onViewChange: (view: SavedView | null) => void;
}

export function AttioViewSelector({ currentViewId, onViewChange }: AttioViewSelectorProps) {
  const { data: views } = useSavedViews("contacts");
  const createView = useCreateSavedView();
  const deleteView = useDeleteSavedView();
  const [isCreating, setIsCreating] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const currentView = views?.find(v => v.id === currentViewId);
  const displayName = currentView?.name || "Todos os contactos";

  const handleCreate = () => {
    if (!newViewName.trim()) return;
    createView.mutate(
      { name: newViewName.trim(), entity_type: "contacts" },
      {
        onSuccess: (view) => {
          onViewChange(view);
          setIsCreating(false);
          setNewViewName("");
        },
      }
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-2.5 text-sm font-medium text-foreground hover:bg-muted/60">
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
          {displayName}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-popover z-50">
        <DropdownMenuItem
          onClick={() => onViewChange(null)}
          className={cn(!currentViewId && "bg-accent")}
        >
          <LayoutGrid className="h-4 w-4 mr-2 text-muted-foreground" />
          Todos os contactos
        </DropdownMenuItem>

        {views && views.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {views.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => onViewChange(view)}
                className={cn("group", currentViewId === view.id && "bg-accent")}
              >
                <LayoutGrid className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{view.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteView.mutate({ id: view.id, entity_type: "contacts" });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        {isCreating ? (
          <div className="px-2 py-1.5 flex gap-1.5">
            <Input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Nome da vista..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setIsCreating(false);
              }}
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={handleCreate}>
              OK
            </Button>
          </div>
        ) : (
          <DropdownMenuItem onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova vista
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
