import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  Send,
  Eye,
  Mail,
  User,
  Loader2,
  Languages,
  Info,
  Bold,
  Italic,
  Link2,
  List,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useActiveEmailConnection, useSendEmail } from "@/hooks/useEmailConnection";
import { useTranslateEmail, LANGUAGE_OPTIONS, TranslationLanguage } from "@/hooks/useEmailTranslation";
import { InboxTemplatePanel } from "@/components/inbox/InboxTemplatePanel";
import { VariableContext } from "@/lib/templateVariables";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    email: string;
    name: string;
    entityType: 'contact' | 'company' | 'lead';
    entityId: string;
  };
  defaultSubject?: string;
  defaultBody?: string;
  templateContext?: VariableContext;
  onSent?: () => void;
}

// Simple HTML preview sanitization
function sanitizeForPreview(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

// Convert textarea content to basic HTML
function textToHtml(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Convert URLs to links
  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" style="color: #0066cc;">$1</a>'
  );
  
  // Convert line breaks
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => `<p style="margin: 0 0 1em 0;">${p.replace(/\n/g, "<br>")}</p>`).join("");
  
  return html;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recipient,
  defaultSubject = "",
  defaultBody = "",
  templateContext,
  onSent,
}: ComposeEmailDialogProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isHtml, setIsHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [showNoConnectionAlert, setShowNoConnectionAlert] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: connection, isLoading: connectionLoading } = useActiveEmailConnection();
  const sendEmail = useSendEmail();
  const translateEmail = useTranslateEmail();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setBody(defaultBody);
      setActiveTab("write");
      setConversationId(null);
    }
  }, [open, defaultSubject, defaultBody]);

  const senderDisplayName = connection?.display_name || connection?.email_address?.split("@")[0] || "Remetente";
  const senderEmail = connection?.email_address || "";

  // Find or create conversation for this email
  const findOrCreateConversation = async (): Promise<string> => {
    if (!currentWorkspace || !workspaceClient) {
      throw new Error("Workspace não disponível");
    }

    // Check for existing conversation with this email
    const { data: existingConversation } = await workspaceClient
      .from("conversations")
      .select("id")
      .eq("workspace_id", currentWorkspace.id)
      .eq("channel", "email")
      .or(`channel_metadata->email.eq.${recipient.email},channel_metadata->>email.eq.${recipient.email}`)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingConversation) {
      return existingConversation.id;
    }

    // Create new conversation
    const { data: newConversation, error } = await workspaceClient
      .from("conversations")
      .insert({
        workspace_id: currentWorkspace.id,
        channel: "email",
        subject: subject || `Conversa com ${recipient.name}`,
        status: "open",
        channel_metadata: {
          email: recipient.email,
          name: recipient.name,
        },
        [`${recipient.entityType}_id`]: recipient.entityId,
      })
      .select("id")
      .single();

    if (error) throw error;
    return newConversation.id;
  };

  const handleSend = async () => {
    if (!connection) {
      setShowNoConnectionAlert(true);
      return;
    }

    if (!subject.trim()) {
      toast.error("Por favor, adicione um assunto");
      return;
    }

    if (!body.trim()) {
      toast.error("Por favor, escreva o conteúdo do email");
      return;
    }

    try {
      // Get or create conversation
      const convId = await findOrCreateConversation();
      setConversationId(convId);

      // Send email
      await sendEmail.mutateAsync({
        connectionId: connection.id,
        conversationId: convId,
        to: recipient.email,
        subject: subject.trim(),
        body: body.trim(),
        isHtml,
      });

      toast.success("Email enviado com sucesso!");
      onSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(`Erro ao enviar email: ${error.message}`);
    }
  };

  const handleTranslate = async (targetLanguage: TranslationLanguage) => {
    if (!body.trim()) {
      toast.error("Por favor, escreva algum conteúdo para traduzir");
      return;
    }

    try {
      const result = await translateEmail.mutateAsync({
        text: body,
        targetLanguage,
        makeNatural: true,
        preserveVariables: true,
        preserveHtml: isHtml,
      });

      setBody(result.translatedText);
      toast.success("Tradução aplicada");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTemplateApply = (content: string, templateSubject?: string) => {
    setBody(content);
    if (templateSubject && !subject) {
      setSubject(templateSubject);
    }
    if (content.includes("<") && content.includes(">")) {
      setIsHtml(true);
    }
    toast.success("Template aplicado");
  };

  const insertFormatting = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);

    let newText = "";
    switch (tag) {
      case "bold":
        newText = `<strong>${selectedText || "texto"}</strong>`;
        break;
      case "italic":
        newText = `<em>${selectedText || "texto"}</em>`;
        break;
      case "link":
        newText = `<a href="URL">${selectedText || "link"}</a>`;
        break;
      case "list":
        newText = `\n<ul>\n  <li>${selectedText || "item"}</li>\n</ul>`;
        break;
    }

    const newBody = body.substring(0, start) + newText + body.substring(end);
    setBody(newBody);
    setIsHtml(true);
  };

  const htmlPreview = isHtml ? sanitizeForPreview(body) : textToHtml(body);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <DialogTitle>Enviar Email</DialogTitle>
              </div>
              
              {/* Sender Identity */}
              {connection && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{senderDisplayName}</span>
                        <span className="text-muted-foreground">&lt;{senderEmail}&gt;</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Configure em Definições → Canais → Email</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <DialogDescription>
              Enviar email para {recipient.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
            {/* No connection warning */}
            {!connectionLoading && !connection && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Nenhuma conta de email conectada.{" "}
                  <a href="/dashboard/settings" className="underline font-medium">
                    Configurar agora
                  </a>
                </span>
              </div>
            )}

            {/* To field */}
            <div className="flex items-center gap-2">
              <Label className="w-16 text-sm text-muted-foreground">Para:</Label>
              <Badge variant="secondary" className="text-sm gap-1.5">
                <User className="w-3 h-3" />
                {recipient.name} &lt;{recipient.email}&gt;
              </Badge>
            </div>

            {/* Subject field */}
            <div className="flex items-center gap-2">
              <Label htmlFor="email-subject" className="w-16 text-sm text-muted-foreground">Assunto:</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do email..."
                className="flex-1"
              />
            </div>

            <Separator />

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("bold")}>
                        <Bold className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Negrito</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("italic")}>
                        <Italic className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Itálico</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("link")}>
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Inserir link</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("list")}>
                        <List className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Lista</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Templates */}
                {templateContext && (
                  <InboxTemplatePanel
                    channel="email"
                    messages={[]}
                    templateContext={templateContext}
                    onApply={handleTemplateApply}
                    trigger={
                      <Button variant="ghost" size="sm" className="gap-1">
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">Templates</span>
                      </Button>
                    }
                  />
                )}

                {/* Translation */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1"
                      disabled={translateEmail.isPending}
                    >
                      {translateEmail.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Traduzir</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Traduzir para:</div>
                      <div className="grid gap-1">
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <Button
                            key={lang.value}
                            variant="ghost"
                            className="justify-start text-sm h-8"
                            onClick={() => handleTranslate(lang.value)}
                            disabled={translateEmail.isPending}
                          >
                            <span className="mr-2">{lang.flag}</span>
                            {lang.label}
                          </Button>
                        ))}
                      </div>
                      <Separator />
                      <div className="text-xs text-muted-foreground">
                        <Info className="w-3 h-3 inline mr-1" />
                        Variáveis são preservadas
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* View mode toggle */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "preview")}>
                <TabsList className="h-8">
                  <TabsTrigger value="write" className="text-xs h-7 px-3">Escrever</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs h-7 px-3 gap-1">
                    <Eye className="w-3 h-3" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content area */}
            <div className="flex-1 min-h-0">
              {activeTab === "write" ? (
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escreva o conteúdo do seu email..."
                  className="w-full h-full min-h-[200px] p-3 text-sm resize-none rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <ScrollArea className="h-full min-h-[200px] rounded-md border bg-white dark:bg-gray-950">
                  <div 
                    className="p-4 prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />
                </ScrollArea>
              )}
            </div>

            {/* HTML indicator */}
            {isHtml && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">HTML</Badge>
                <span>O email será enviado com formatação HTML</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-muted/30">
            <div className="text-xs text-muted-foreground">
              {connection ? "Email será enviado via SMTP" : "Configure uma conta de email para enviar"}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={sendEmail.isPending || !connection}
              >
                {sendEmail.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Connection Alert */}
      <AlertDialog open={showNoConnectionAlert} onOpenChange={setShowNoConnectionAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Conta de Email Não Configurada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Para enviar emails através da aplicação, precisa de conectar uma conta de email nas definições.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.location.href = "/dashboard/settings"}>
              Ir para Definições
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
