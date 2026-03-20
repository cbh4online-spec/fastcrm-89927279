import { useState, useEffect } from "react";
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
import { KnowledgeBaseHelpModal } from "@/components/knowledge-base/KnowledgeBaseHelpModal";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts/KeyboardShortcutsModal";
import { ShortcutCombo } from "@/components/keyboard-shortcuts/KbdKey";
import { BugReportModal } from "@/components/bug-report/BugReportModal";

export function HelpSupportDropdown() {
  const { t } = useTranslation("nav");
  const [kbOpen, setKbOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  // Global "?" shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping =
        ["input", "textarea", "select"].includes(tag) ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "?" && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
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
          <DropdownMenuItem onClick={() => setKbOpen(true)}>
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
          <DropdownMenuItem onClick={() => setShortcutsOpen(true)} className="flex items-center">
            <Keyboard className="mr-2 h-4 w-4" />
            {t("keyboardShortcuts")}
            <span className="ml-auto">
              <ShortcutCombo keys={["?"]} size="sm" />
            </span>
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
          <DropdownMenuItem onClick={() => setBugReportOpen(true)} className="text-destructive">
            <Bug className="mr-2 h-4 w-4" />
            {t("reportBug")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <KnowledgeBaseHelpModal open={kbOpen} onOpenChange={setKbOpen} />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
