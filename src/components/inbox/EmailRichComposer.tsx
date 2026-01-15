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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Send,
  Eye,
  Mail,
  User,
  Loader2,
  Languages,
  Sparkles,
  Check,
  X,
  FileText,
  Bold,
  Italic,
  Link2,
  List,
  ArrowLeft,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useActiveEmailConnection, useSendEmail, EmailConnection } from "@/hooks/useEmailConnection";
import { useTranslateEmail, LANGUAGE_OPTIONS, TranslationLanguage } from "@/hooks/useEmailTranslation";
import { InboxTemplatePanel } from "./InboxTemplatePanel";
import { VariableContext } from "@/lib/templateVariables";
import { Message } from "@/hooks/useMessages";

interface EmailRichComposerProps {
  conversationId: string;
  to: string;
  defaultSubject?: string;
  inReplyTo?: string;
  references?: string[];
  messages?: Message[];
  templateContext?: VariableContext;
  onClose: () => void;
  onSent?: () => void;
}

// Simple HTML preview sanitization for display
function sanitizeForPreview(html: string): string {
  // Remove scripts
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

export function EmailRichComposer({
  conversationId,
  to,
  defaultSubject = "",
  inReplyTo,
  references,
  messages,
  templateContext,
  onClose,
  onSent,
}: EmailRichComposerProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationResult, setTranslationResult] = useState<{
    original: string;
    translated: string;
    changes: string[];
  } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { data: connection } = useActiveEmailConnection();
  const sendEmail = useSendEmail();
  const translateEmail = useTranslateEmail();

  // Determine sender display name
  const senderDisplayName = connection?.display_name || connection?.email_address?.split("@")[0] || "Remetente";
  const senderEmail = connection?.email_address || "";

  const handleSend = async () => {
    if (!connection) {
      toast.error("Nenhuma conta de email conectada");
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
      await sendEmail.mutateAsync({
        connectionId: connection.id,
        conversationId,
        to,
        subject: subject.trim(),
        body: body.trim(),
        isHtml,
        inReplyTo,
        references,
      });

      toast.success("Email enviado com sucesso!");
      onSent?.();
      onClose();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTranslate = async (targetLanguage: TranslationLanguage, makeNatural: boolean) => {
    if (!body.trim()) {
      toast.error("Por favor, escreva algum conteúdo para traduzir");
      return;
    }

    try {
      const result = await translateEmail.mutateAsync({
        text: body,
        targetLanguage,
        makeNatural,
        preserveVariables: true,
        preserveHtml: isHtml,
      });

      setTranslationResult({
        original: body,
        translated: result.translatedText,
        changes: result.changes,
      });
      setShowTranslation(true);
    } catch (error) {
      // Error handled by hook
    }
  };

  const applyTranslation = () => {
    if (translationResult) {
      setBody(translationResult.translated);
      setTranslationResult(null);
      setShowTranslation(false);
      toast.success("Tradução aplicada");
    }
  };

  const cancelTranslation = () => {
    setTranslationResult(null);
    setShowTranslation(false);
  };

  const handleTemplateApply = (content: string, templateSubject?: string) => {
    setBody(content);
    if (templateSubject && !subject) {
      setSubject(templateSubject);
    }
    // Check if content appears to be HTML
    if (content.includes("<") && content.includes(">")) {
      setIsHtml(true);
    }
  };

  // Insert basic formatting
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

  // Generate HTML preview
  const htmlPreview = isHtml ? sanitizeForPreview(body) : textToHtml(body);

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Header with sender identity */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <span className="font-medium">Compor Email</span>
          </div>
        </div>
        
        {/* Sender Identity Display */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium">{senderDisplayName}</span>
                  <span className="text-muted-foreground ml-1">&lt;{senderEmail}&gt;</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Identidade do remetente</p>
              <p className="text-xs text-muted-foreground">Configure em Definições → Canais → Email</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Email form */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
        {/* To field */}
        <div className="flex items-center gap-2">
          <Label className="w-16 text-sm text-muted-foreground">Para:</Label>
          <div className="flex-1">
            <Badge variant="secondary" className="text-sm">
              {to}
            </Badge>
          </div>
        </div>

        {/* Subject field */}
        <div className="flex items-center gap-2">
          <Label htmlFor="subject" className="w-16 text-sm text-muted-foreground">Assunto:</Label>
          <Input
            id="subject"
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
                messages={messages || []}
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
                        onClick={() => handleTranslate(lang.value, false)}
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
                    Variáveis como {"{{lead.name}}"} são preservadas
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
          O destinatário verá o email com a formatação mostrada no Preview
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sendEmail.isPending}>
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

      {/* Translation Preview Dialog */}
      <Dialog open={showTranslation} onOpenChange={setShowTranslation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Pré-visualização da Tradução
            </DialogTitle>
            <DialogDescription>
              Revise a tradução antes de aplicar. Variáveis e links foram preservados.
            </DialogDescription>
          </DialogHeader>

          {translationResult && (
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-auto">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Original</Label>
                <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                  {translationResult.original}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  Traduzido
                  <Badge variant="secondary" className="text-[10px]">Novo</Badge>
                </Label>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-md text-sm whitespace-pre-wrap border border-green-200 dark:border-green-800">
                  {translationResult.translated}
                </div>
              </div>
            </div>
          )}

          {translationResult?.changes && translationResult.changes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Alterações notáveis:</Label>
              <ul className="text-xs text-muted-foreground space-y-1">
                {translationResult.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelTranslation}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={applyTranslation}>
              <Check className="w-4 h-4 mr-2" />
              Aplicar Tradução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
