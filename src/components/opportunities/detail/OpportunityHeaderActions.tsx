import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Copy, Link, Trash2, Star, Mail } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface OpportunityHeaderActionsProps {
  opportunityId: string;
  title: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onDelete?: () => Promise<void>;
}

export function OpportunityHeaderActions({ opportunityId, title, isFavorite, onToggleFavorite, onDelete }: OpportunityHeaderActionsProps) {
  const { t } = useTranslation("crm");
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("oppDetail_copiedUrl"));
  };

  const copyId = () => {
    navigator.clipboard.writeText(opportunityId);
    toast.success(t("oppDetail_copiedId"));
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      navigate("/dashboard/opportunities");
    }
  };

  const handleComposeEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(title)}`, "_blank");
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleComposeEmail}>
        <Mail className="w-3.5 h-3.5" />
        {t("oppDetail_composeEmail")}
      </Button>

      {onToggleFavorite && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleFavorite}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")} />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={copyUrl}>
            <Link className="w-4 h-4 mr-2" />
            {t("oppDetail_copyUrl")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyId}>
            <Copy className="w-4 h-4 mr-2" />
            {t("oppDetail_copyId")}
          </DropdownMenuItem>
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t("delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDeal")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCompaniesDesc")} "{title}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
