import { useState } from "react";
import { useSavedViews, useCreateSavedView, useDeleteSavedView } from "@/hooks/useSavedViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, Plus, Trash2, ChevronDown, Loader2 } from "lucide-react";

interface SavedViewsDropdownProps {
  entityType: string;
  onSelectView?: (filters: Record<string, unknown> | null) => void;
}

export function SavedViewsDropdown({ entityType, onSelectView }: SavedViewsDropdownProps) {
  const { data: views, isLoading } = useSavedViews(entityType);
  const createView = useCreateSavedView();
  const deleteView = useDeleteSavedView();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedView, setSelectedView] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    createView.mutate(
      { name, entity_type: entityType },
      { onSuccess: () => { setShowCreate(false); setName(""); } }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {selectedView
                ? views?.find((v) => v.id === selectedView)?.name || "Views"
                : "Views"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => {
            setSelectedView(null);
            onSelectView?.(null);
          }}>
            All Records
          </DropdownMenuItem>
          {isLoading ? (
            <DropdownMenuItem disabled>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              Loading...
            </DropdownMenuItem>
          ) : (
            views?.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className="flex items-center justify-between"
                onClick={() => {
                  setSelectedView(view.id);
                  onSelectView?.(view.filters);
                }}
              >
                <span className="truncate">{view.name}</span>
                <button
                  className="ml-2 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteView.mutate({ id: view.id, entity_type: entityType });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Save Current View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>View Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hot Leads, High Value Deals"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={!name.trim() || createView.isPending} className="w-full">
              {createView.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save View
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
