import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  HelpCircle, BookOpen, MessageCircle, Video, FileText, ExternalLink, Keyboard, Lightbulb, Bug
} from "lucide-react";
import { toast } from "sonner";

export function HelpSupportDropdown() {
  const { t } = useTranslation("nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{t("helpSupport")}</p>
          <p className="text-xs text-muted-foreground">{t("helpResources")}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.info(t("knowledgeBaseWip"))}>
          <BookOpen className="mr-2 h-4 w-4" />
          {t("knowledgeBase")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info(t("tutorialsWip"))}>
          <Video className="mr-2 h-4 w-4" />
          {t("videoTutorials")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open("https://docs.lovable.dev", "_blank")}>
          <FileText className="mr-2 h-4 w-4" />
          {t("documentation")}
          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.info(t("shortcutsInfo"), { duration: 5000 })}>
          <Keyboard className="mr-2 h-4 w-4" />
          {t("keyboardShortcuts")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info(t("tipsEnabled"))}>
          <Lightbulb className="mr-2 h-4 w-4" />
          {t("tipsAndTricks")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.info(t("supportChatWip"))}>
          <MessageCircle className="mr-2 h-4 w-4" />
          {t("supportChat")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info(t("bugReportWip"))} className="text-amber-600">
          <Bug className="mr-2 h-4 w-4" />
          {t("reportBug")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
