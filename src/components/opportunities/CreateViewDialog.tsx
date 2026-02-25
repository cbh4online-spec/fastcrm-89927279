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
  const [viewMode, setViewMode] = useState("kanban");

  const handleCreate = () => {
    if (!name.trim()) return;
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
          setViewMode("kanban");
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
            <Label>{t("dealName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hot Deals, Enterprise Pipeline"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <div>
            <Label>{t("kanbanView")}</Label>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kanban">{t("kanban")}</SelectItem>
                <SelectItem value="list">{t("list")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
