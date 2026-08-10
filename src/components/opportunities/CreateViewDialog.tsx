import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateSavedView } from "@/hooks/useSavedViews";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CreateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (viewId: string) => void;
}

export function CreateViewDialog({ open, onOpenChange, onCreated }: CreateViewDialogProps) {
  const { t } = useTranslation("crm");
  const createView = useCreateSavedView();
  const [name, setName] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    setError(null);
    createView.mutate(
      {
        name: name.trim(),
        entity_type: "opportunities",
        view_mode: viewMode,
      },
      {
        onSuccess: (view) => {
          onCreated?.(view.id);
          onOpenChange(false);
          setName("");
          setViewMode("board");
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sidebarCreateView")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="saved-view-name">{t("viewName")}</Label>
            <Input
              id="saved-view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Hot Deals, Pipeline Enterprise"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <div>
            <Label>{t("viewType")}</Label>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as "board" | "table")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="board">{t("kanban")}</SelectItem>
                <SelectItem value="table">{t("list")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createView.isPending}
            className="w-full"
          >
            {createView.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("sidebarCreateView")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
