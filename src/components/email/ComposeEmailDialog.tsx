import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  Clock,
  Paperclip,
  PenLine,
  X,
  CreditCard,
  Sparkles,
  CalendarPlus,
  MapPin,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { useActiveEmailConnection, useSendEmail } from "@/hooks/useEmailConnection";
import { useTranslateEmail, LANGUAGE_OPTIONS, TranslationLanguage } from "@/hooks/useEmailTranslation";
import { InboxTemplatePanel } from "@/components/inbox/InboxTemplatePanel";
import { VariableContext } from "@/lib/templateVariables";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useEmailSignature } from "@/hooks/useEmailSignature";
import { useScheduleEmail } from "@/hooks/useScheduledEmails";
import { EmailAttachmentList, type EmailAttachment } from "./EmailAttachmentList";
import { InsertPaymentLinkDialog } from "./InsertPaymentLinkDialog";
import { AIEmailAssistPanel } from "./AIEmailAssistPanel";
import { useCalendars } from "@/hooks/useCalendars";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMinutes } from "date-fns";

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
  autoCreateContact?: boolean;
}

function sanitizeForPreview(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

function textToHtml(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" style="color: #0066cc;">$1</a>'
  );
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => `<p style="margin: 0 0 1em 0;">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return html;
}

function buildAttachmentsHtml(attachments: EmailAttachment[]): string {
  if (attachments.length === 0) return "";
  const links = attachments.map(a => `<a href="${a.url}" style="color: #0066cc;">${a.name}</a>`).join(" · ");
  return `<div style="margin-top: 1.5em; padding-top: 1em; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">📎 Anexos: ${links}</div>`;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recipient,
  defaultSubject = "",
  defaultBody = "",
  templateContext,
  onSent,
  autoCreateContact = false,
}: ComposeEmailDialogProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isHtml, setIsHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [showNoConnectionAlert, setShowNoConnectionAlert] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCreatingContact, setIsCreatingContact] = useState(false);

  // New features state
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [includeSignature, setIncludeSignature] = useState(true);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Meeting scheduling state
  const [showMeetingPanel, setShowMeetingPanel] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date | undefined>();
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: connection, isLoading: connectionLoading } = useActiveEmailConnection();
  const sendEmail = useSendEmail();
  const translateEmail = useTranslateEmail();
  const { signatureHtml, isLoading: sigLoading } = useEmailSignature();
  const scheduleEmail = useScheduleEmail();
  const { calendars } = useCalendars();
  const { createEvent } = useCalendarEvents(selectedCalendarId ? [selectedCalendarId] : []);

  // Auto-select first calendar
  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(calendars[0].id);
    }
  }, [calendars, selectedCalendarId]);

  // Default template context when none provided
  const effectiveTemplateContext: VariableContext = templateContext || {
    contact: { name: recipient.name, email: recipient.email },
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setBody(defaultBody);
      setActiveTab("write");
      setConversationId(null);
      setShowCcBcc(false);
      setCc("");
      setBcc("");
      setIncludeSignature(true);
      setAttachments([]);
      setScheduledDate(undefined);
      setShowSchedulePicker(false);
      setShowMeetingPanel(false);
      setMeetingDate(undefined);
      setMeetingTime("10:00");
      setMeetingDuration("60");
      setMeetingLocation("");
      setMeetingUrl("");
    }
  }, [open, defaultSubject, defaultBody]);

  const senderDisplayName = connection?.display_name || connection?.email_address?.split("@")[0] || "Remetente";
  const senderEmail = connection?.email_address || "";

  const findOrCreateContact = async (): Promise<{ id: string; entityType: 'contact' | 'lead' | 'company' }> => {
    if (!currentWorkspace || !workspaceClient || !user) {
      throw new Error("Workspace não disponível");
    }
    if (recipient.entityId && recipient.entityId !== "new") {
      return { id: recipient.entityId, entityType: recipient.entityType };
    }
    const { data: existingContact } = await workspaceClient
      .from("contacts")
      .select("id")
      .eq("workspace_id", currentWorkspace.id)
      .eq("email", recipient.email)
      .maybeSingle();
    if (existingContact) return { id: existingContact.id, entityType: "contact" };

    const { data: existingLead } = await workspaceClient
      .from("leads")
      .select("id")
      .eq("workspace_id", currentWorkspace.id)
      .eq("email", recipient.email)
      .maybeSingle();
    if (existingLead) return { id: existingLead.id, entityType: "lead" };

    if (autoCreateContact) {
      setIsCreatingContact(true);
      const { data: newContact, error } = await workspaceClient
        .from("contacts")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: recipient.name || recipient.email.split("@")[0],
          email: recipient.email,
          tags: ["criado-via-email"],
        })
        .select("id")
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace.id] });
      toast.success(`Contacto "${recipient.name}" criado automaticamente`);
      setIsCreatingContact(false);
      return { id: newContact.id, entityType: "contact" };
    }
    throw new Error("Nenhum contacto encontrado com este email");
  };

  const findOrCreateConversation = async (entityId: string, entityType: 'contact' | 'lead' | 'company'): Promise<string> => {
    if (!currentWorkspace || !workspaceClient) throw new Error("Workspace não disponível");

    const { data: existingConversation } = await workspaceClient
      .from("conversations")
      .select("id")
      .eq("workspace_id", currentWorkspace.id)
      .eq("channel", "email")
      .or(`channel_metadata->>email.eq.${recipient.email},channel_metadata->>from_email.eq.${recipient.email}`)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingConversation) return existingConversation.id;

    const entityRef: Record<string, string> = {};
    entityRef[`${entityType}_id`] = entityId;

    const { data: newConversation, error } = await workspaceClient
      .from("conversations")
      .insert({
        workspace_id: currentWorkspace.id,
        channel: "email",
        status: "open",
        channel_metadata: {
          email: recipient.email,
          name: recipient.name,
          subject: subject || `Conversa com ${recipient.name}`,
        },
        ...entityRef,
      })
      .select("id")
      .single();
    if (error) throw error;
    return newConversation.id;
  };

  const buildMeetingHtml = (): string => {
    if (!showMeetingPanel || !meetingDate) return "";
    const [h, m] = meetingTime.split(":").map(Number);
    const start = new Date(meetingDate);
    start.setHours(h, m, 0, 0);
    const end = addMinutes(start, parseInt(meetingDuration));
    let html = `<div style="margin-top: 1.5em; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">`;
    html += `<p style="margin: 0 0 8px 0; font-weight: 600; font-size: 15px;">📅 Reunião Agendada</p>`;
    html += `<p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Data:</strong> ${format(start, "dd/MM/yyyy")}</p>`;
    html += `<p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Hora:</strong> ${format(start, "HH:mm")} – ${format(end, "HH:mm")}</p>`;
    if (meetingLocation) html += `<p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Local:</strong> ${meetingLocation}</p>`;
    if (meetingUrl) html += `<p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Link:</strong> <a href="${meetingUrl}" style="color: #0066cc;">${meetingUrl}</a></p>`;
    html += `</div>`;
    return html;
  };

  const buildFinalBody = (): string => {
    let finalBody = body.trim();
    const attachHtml = buildAttachmentsHtml(attachments);
    const meetingHtml = buildMeetingHtml();

    if (isHtml || includeSignature || attachments.length > 0 || meetingHtml) {
      if (!isHtml) {
        finalBody = textToHtml(finalBody);
      }
      finalBody += meetingHtml;
      finalBody += attachHtml;
      if (includeSignature && signatureHtml) {
        finalBody += `<div style="margin-top: 1.5em;">${signatureHtml}</div>`;
      }
      return finalBody;
    }
    return finalBody;
  };

  const createMeetingEvent = async () => {
    if (!showMeetingPanel || !meetingDate || !selectedCalendarId) return;
    const [h, m] = meetingTime.split(":").map(Number);
    const start = new Date(meetingDate);
    start.setHours(h, m, 0, 0);
    const end = addMinutes(start, parseInt(meetingDuration));

    const entityRef: Record<string, string> = {};
    if (recipient.entityType === 'contact') entityRef.contact_id = recipient.entityId;
    if (recipient.entityType === 'company') entityRef.company_id = recipient.entityId;
    if (recipient.entityType === 'lead') entityRef.lead_id = recipient.entityId;

    await createEvent({
      calendar_id: selectedCalendarId,
      title: subject || `Reunião com ${recipient.name}`,
      description: `Reunião agendada via email com ${recipient.name} (${recipient.email})`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: meetingLocation || undefined,
      meeting_url: meetingUrl || undefined,
      status: 'confirmed',
      attendees: [{ id: '', name: recipient.name, email: recipient.email, status: 'invited' }],
      ...entityRef,
    });
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
      const { id: entityId, entityType } = await findOrCreateContact();
      const convId = await findOrCreateConversation(entityId, entityType);
      setConversationId(convId);

      const finalBody = buildFinalBody();
      const finalIsHtml = isHtml || (includeSignature && !!signatureHtml) || attachments.length > 0 || (showMeetingPanel && !!meetingDate);

      await sendEmail.mutateAsync({
        connectionId: connection.id,
        conversationId: convId,
        to: recipient.email,
        subject: subject.trim(),
        body: finalBody,
        isHtml: finalIsHtml,
      });

      toast.success("Email enviado com sucesso!");
      onSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(`Erro ao enviar email: ${error.message}`);
    }
  };

  const handleScheduleSend = async () => {
    if (!connection || !scheduledDate) return;
    if (!subject.trim()) {
      toast.error("Por favor, adicione um assunto");
      return;
    }
    if (!body.trim()) {
      toast.error("Por favor, escreva o conteúdo do email");
      return;
    }

    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduleAt = new Date(scheduledDate);
    scheduleAt.setHours(hours, minutes, 0, 0);

    if (scheduleAt <= new Date()) {
      toast.error("A data de agendamento deve ser no futuro");
      return;
    }

    try {
      const { id: entityId, entityType } = await findOrCreateContact();
      const convId = await findOrCreateConversation(entityId, entityType);

      const finalBody = buildFinalBody();
      const attData = attachments.map(a => ({ name: a.name, url: a.url }));

      await scheduleEmail.mutateAsync({
        connectionId: connection.id,
        conversationId: convId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject: subject.trim(),
        body: finalBody,
        isHtml: isHtml || (includeSignature && !!signatureHtml) || attachments.length > 0,
        attachments: attData,
        scheduledFor: scheduleAt,
      });

      toast.success(`Email agendado para ${format(scheduleAt, "dd/MM/yyyy HH:mm")}`);
      onSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error scheduling email:", error);
      toast.error(`Erro ao agendar email: ${error.message}`);
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
    } catch {}
  };

  const handleTemplateApply = (content: string, templateSubject?: string) => {
    setBody(content);
    if (templateSubject && !subject) setSubject(templateSubject);
    if (content.includes("<") && content.includes(">")) setIsHtml(true);
    toast.success("Template aplicado");
  };

  const handlePaymentLinkInsert = (html: string) => {
    setBody((prev) => prev + "\n" + html);
    setIsHtml(true);
  };

  const insertFormatting = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    let newText = "";
    switch (tag) {
      case "bold": newText = `<strong>${selectedText || "texto"}</strong>`; break;
      case "italic": newText = `<em>${selectedText || "texto"}</em>`; break;
      case "link": newText = `<a href="URL">${selectedText || "link"}</a>`; break;
      case "list": newText = `\n<ul>\n  <li>${selectedText || "item"}</li>\n</ul>`; break;
    }
    const newBody = body.substring(0, start) + newText + body.substring(end);
    setBody(newBody);
    setIsHtml(true);
  };

  const htmlPreview = (() => {
    let preview = isHtml ? sanitizeForPreview(body) : textToHtml(body);
    preview += buildAttachmentsHtml(attachments);
    if (includeSignature && signatureHtml) {
      preview += `<div style="margin-top: 1.5em; border-top: 1px solid #e5e7eb; padding-top: 1em;">${signatureHtml}</div>`;
    }
    return preview;
  })();

  const isBusy = sendEmail.isPending || scheduleEmail.isPending || isCreatingContact;

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
            <DialogDescription>Enviar email para {recipient.name}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            {/* No connection warning */}
            {!connectionLoading && !connection && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Nenhuma conta de email conectada.{" "}
                  <a href="/dashboard/settings" className="underline font-medium">Configurar agora</a>
                </span>
              </div>
            )}

            {/* To field */}
            <div className="flex items-center gap-2">
              <Label className="w-16 text-sm text-muted-foreground shrink-0">Para:</Label>
              <Badge variant="secondary" className="text-sm gap-1.5">
                <User className="w-3 h-3" />
                {recipient.name} &lt;{recipient.email}&gt;
              </Badge>
              {!showCcBcc && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground ml-auto h-6 px-2" onClick={() => setShowCcBcc(true)}>
                  CC/BCC
                </Button>
              )}
            </div>

            {/* CC/BCC fields */}
            {showCcBcc && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="w-16 text-sm text-muted-foreground shrink-0">CC:</Label>
                  <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="email1@ex.com, email2@ex.com" className="flex-1 h-8 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-16 text-sm text-muted-foreground shrink-0">BCC:</Label>
                  <Input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="email1@ex.com, email2@ex.com" className="flex-1 h-8 text-sm" />
                </div>
              </div>
            )}

            {/* Subject field */}
            <div className="flex items-center gap-2">
              <Label htmlFor="email-subject" className="w-16 text-sm text-muted-foreground shrink-0">Assunto:</Label>
              <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email..." className="flex-1" />
            </div>

            <Separator />

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("bold")}><Bold className="w-4 h-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Negrito</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("italic")}><Italic className="w-4 h-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Itálico</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("link")}><Link2 className="w-4 h-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Inserir link</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => insertFormatting("list")}><List className="w-4 h-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Lista</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Templates — always available */}
                <InboxTemplatePanel
                  channel="email"
                  messages={[]}
                  templateContext={effectiveTemplateContext}
                  onApply={handleTemplateApply}
                  trigger={
                    <Button variant="ghost" size="sm" className="gap-1">
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Templates</span>
                    </Button>
                  }
                />

                {/* Attachments */}
                <EmailAttachmentList attachments={attachments} onChange={setAttachments} disabled={isBusy} />

                {/* Payment link */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setShowPaymentDialog(true)}>
                        <CreditCard className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Inserir link de pagamento</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* AI Assist */}
                <AIEmailAssistPanel
                  body={body}
                  subject={subject}
                  onApplyBody={setBody}
                  onApplySubject={setSubject}
                  disabled={isBusy}
                />

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Translation */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1" disabled={translateEmail.isPending}>
                      {translateEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                      <span className="hidden sm:inline">Traduzir</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Traduzir para:</div>
                      <div className="grid gap-1">
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <Button key={lang.value} variant="ghost" className="justify-start text-sm h-8" onClick={() => handleTranslate(lang.value)} disabled={translateEmail.isPending}>
                            <span className="mr-2">{lang.flag}</span>{lang.label}
                          </Button>
                        ))}
                      </div>
                      <Separator />
                      <div className="text-xs text-muted-foreground"><Info className="w-3 h-3 inline mr-1" />Variáveis são preservadas</div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* View mode toggle */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "write" | "preview")}>
                <TabsList className="h-8">
                  <TabsTrigger value="write" className="text-xs h-7 px-3">Escrever</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs h-7 px-3 gap-1">
                    <Eye className="w-3 h-3" />Preview
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
                  className="w-full h-full min-h-[200px] p-3 text-sm resize-none rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <ScrollArea className="h-full min-h-[200px] rounded-md border bg-white text-gray-900">
                  <div className="p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                </ScrollArea>
              )}
            </div>

            {/* Signature toggle + HTML indicator */}
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                {signatureHtml && (
                  <div className="flex items-center gap-2">
                    <Switch id="sig-toggle" checked={includeSignature} onCheckedChange={setIncludeSignature} className="scale-75" />
                    <Label htmlFor="sig-toggle" className="text-xs cursor-pointer">Assinatura</Label>
                  </div>
                )}
                {isHtml && <Badge variant="outline" className="text-[10px]">HTML</Badge>}
                {attachments.length > 0 && (
                  <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{attachments.length} anexo(s)</span>
                )}
              </div>
            </div>

            {/* Schedule picker */}
            {showSchedulePicker && (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium"><Clock className="w-4 h-4" />Agendar envio</div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setShowSchedulePicker(false); setScheduledDate(undefined); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-3 items-start">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[180px] justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                        {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-[120px] h-8" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-muted/30">
            <div className="text-xs text-muted-foreground">
              {connection ? "Email será enviado via SMTP" : "Configure uma conta de email para enviar"}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>

              {showSchedulePicker && scheduledDate ? (
                <Button onClick={handleScheduleSend} disabled={isBusy || !connection}>
                  {scheduleEmail.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A agendar...</>
                  ) : (
                    <><Clock className="w-4 h-4 mr-2" />Agendar para {format(scheduledDate, "dd/MM")}</>
                  )}
                </Button>
              ) : (
                <div className="flex">
                  <Button onClick={handleSend} disabled={isBusy || !connection} className="rounded-r-none">
                    {sendEmail.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A enviar...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Enviar</>
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button disabled={isBusy || !connection} className="rounded-l-none border-l border-l-primary-foreground/20 px-2">
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowSchedulePicker(true)}>
                        <Clock className="w-4 h-4 mr-2" />Agendar envio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      <InsertPaymentLinkDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onInsert={handlePaymentLinkInsert}
        recipientName={recipient?.name}
        onSubjectSuggestion={(s) => { if (!subject.trim()) setSubject(s); }}
      />
    </>
  );
}
