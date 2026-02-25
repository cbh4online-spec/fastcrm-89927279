import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Pencil, Copy, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SavedView } from "@/hooks/useSavedViews";
import { EmojiIconPicker } from "./EmojiIconPicker";

interface ViewSettingsDropdownProps {
  activeView: SavedView | null;
  onRename?: (id: string, newName: string, icon?: string | null) => void;
  onDuplicate?: (view: SavedView) => void;
  onSetDefault?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ViewSettingsDropdown({
  activeView,
  onRename,
  onDuplicate,
  onSetDefault,
  onDelete,
}: ViewSettingsDropdownProps) {
  const { t } = useTranslation("crm");
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<string | null>(null);

  if (!activeView) return null;

  const handleRenameOpen = () => {
    setNewName(activeView.name);
    setNewIcon(activeView.icon);
    setRenameOpen(true);
  };

  const handleRenameSubmit = () => {
    if (newName.trim() && onRename) {
      onRename(activeView.id, newName.trim(), newIcon);
    }
    setRenameOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-3.5 w-3.5" />
            {t("viewSettings", "View settings")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleRenameOpen}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            {t("viewSettingsRename", "Rename")}
          </DropdownMenuItem>
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(activeView)}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              {t("sidebarDuplicate", "Duplicate")}
            </DropdownMenuItem>
          )}
          {onSetDefault && (
            <DropdownMenuItem onClick={() => onSetDefault(activeView.id)}>
              <Star className="h-3.5 w-3.5 mr-2" />
              {t("sidebarSetDefault")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onDelete && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(activeView.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {t("sidebarDeleteView")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("viewSettingsRename", "Rename")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 items-center">
            <EmojiIconPicker
              currentIcon={newIcon}
              viewName={activeView.name}
              onSelect={setNewIcon}
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t("cancel", "Cancel")}
            </Button>
            <Button onClick={handleRenameSubmit}>{t("save", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
