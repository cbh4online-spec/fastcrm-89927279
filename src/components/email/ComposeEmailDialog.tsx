import { useState, useRef, useEffect, useCallback } from "react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Eye,
  Mail,
  User,
  Loader2,
  Languages,
  Info,
  FileText,
  AlertTriangle,
  ChevronDown,
  Clock,
  Paperclip,
  X,
  CreditCard,
  Sparkles,
  CalendarPlus,
  MapPin,
  Video,
  Search,
  Plus,
  Flag,
  MailCheck,
  Upload,
  PenLine,
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
import { RichTextEditor } from "@/components/email-builder/RichTextEditor";
import { EmailEditorProvider } from "@/contexts/EmailEditorContext";
import { MergeTagsBar } from "@/components/html-email-editor/MergeTagsBar";
import { useEntitySearch, SearchableEntity } from "@/hooks/useEntitySearch";

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

type EmailPriority = 'normal' | 'high' | 'urgent';

const PRIORITY_CONFIG: Record<EmailPriority, { label: string; icon: typeof Flag; color: string }> = {
  normal: { label: 'Normal', icon: Flag, color: 'text-muted-foreground' },
  high: { label: 'Alta', icon: Flag, color: 'text-amber-500' },
  urgent: { label: 'Urgente', icon: Flag, color: 'text-destructive' },
};

interface RecipientEntry {
  email: string;
  name: string;
  entityType: 'contact' | 'company' | 'lead';
  entityId: string;
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

// Recipient search component
function RecipientSearchInput({
  recipients,
  onAdd,
  onRemove,
  placeholder = "Pesquisar contactos...",
}: {
  recipients: RecipientEntry[];
  onAdd: (entry: RecipientEntry) => void;
  onRemove: (email: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { searchContacts, searchLeads, isLoading } = useEntitySearch();
  const [results, setResults] = useState<SearchableEntity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const [contacts, leads] = await Promise.all([
      searchContacts(q),
      searchLeads(q),
    ]);
    const all = [...contacts, ...leads].filter(
      (e) => e.email && !recipients.some((r) => r.email === e.email)
    );
    setResults(all);
  }, [searchContacts, searchLeads, recipients]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length >= 2) {
        handleSearch(query);
        setShowDropdown(true);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, handleSearch]);

  const handleSelect = (entity: SearchableEntity) => {
    onAdd({
      email: entity.email!,
      name: entity.name,
      entityType: entity.type,
      entityId: entity.id,
    });
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.includes('@') && !results.length) {
      e.preventDefault();
      onAdd({
        email: query.trim(),
        name: query.split('@')[0],
        entityType: 'contact',
        entityId: 'new',
      });
      setQuery("");
    }
    if (e.key === 'Backspace' && !query && recipients.length > 0) {
      onRemove(recipients[recipients.length - 1].email);
    }
  };

  return (
    <div className="relative flex-1">
      <div className="flex flex-wrap items-center gap-1 min-h-[36px] px-2 py-1 rounded-md border border-input bg-background">
        {recipients.map((r) => (
          <Badge key={r.email} variant="secondary" className="text-xs gap-1 h-6 shrink-0">
            <User className="w-3 h-3" />
            {r.name}
            <button
              type="button"
              onClick={() => onRemove(r.email)}
              className="ml-0.5 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={recipients.length === 0 ? placeholder : "Adicionar..."}
          className="flex-1 min-w-[120px] h-7 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
          {results.map((entity) => (
            <button
              key={entity.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(entity)}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{entity.name}</div>
                <div className="text-xs text-muted-foreground truncate">{entity.email}</div>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {entity.type === 'contact' ? 'Contacto' : entity.type === 'lead' ? 'Lead' : 'Empresa'}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-3">
          <p className="text-xs text-muted-foreground text-center">
            Nenhum resultado. {query.includes('@') ? 'Pressione Enter para adicionar.' : 'Escreva um email válido.'}
          </p>
        </div>
      )}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [showNoConnectionAlert, setShowNoConnectionAlert] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCreatingContact, setIsCreatingContact] = useState(false);

  // Recipients
  const [recipients, setRecipients] = useState<RecipientEntry[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");

  // Options
  const [includeSignature, setIncludeSignature] = useState(true);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const [readReceipt, setReadReceipt] = useState(false);
  const [showMergeTags, setShowMergeTags] = useState(false);

  // Meeting scheduling state
  const [showMeetingPanel, setShowMeetingPanel] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date | undefined>();
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

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
      setPriority('normal');
      setReadReceipt(false);
      setShowMergeTags(false);
      setRecipients([{
        email: recipient.email,
        name: recipient.name,
        entityType: recipient.entityType,
        entityId: recipient.entityId,
      }]);
    }
  }, [open, defaultSubject, defaultBody, recipient]);

  const senderDisplayName = connection?.display_name || connection?.email_address?.split("@")[0] || "Remetente";
  const senderEmail = connection?.email_address || "";

  const primaryRecipient = recipients[0] || recipient;

  const findOrCreateContact = async (): Promise<{ id: string; entityType: 'contact' | 'lead' | 'company' }> => {
    if (!currentWorkspace || !workspaceClient || !user) {
      throw new Error("Workspace não disponível");
    }
    if (primaryRecipient.entityId && primaryRecipient.entityId !== "new") {
      return { id: primaryRecipient.entityId, entityType: primaryRecipient.entityType };
    }
    const { data: existingContact } = await workspaceClient
      .from("contacts")
      .select("id")
      .eq("workspace_id", currentWorkspace.id)
      .eq("email", primaryRecipient.email)
      .maybeSingle();
    if (existingContact) return { id: existingContact.id, entityType: "contact" };

    const { data: existingLead } = await workspaceClient
      .from("leads")
      .select("id")
      .eq("workspace_id", currentWorkspace.id)
      .eq("email", primaryRecipient.email)
      .maybeSingle();
    if (existingLead) return { id: existingLead.id, entityType: "lead" };

    if (autoCreateContact) {
      setIsCreatingContact(true);
      const { data: newContact, error } = await workspaceClient
        .from("contacts")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: primaryRecipient.name || primaryRecipient.email.split("@")[0],
          email: primaryRecipient.email,
          tags: ["criado-via-email"],
        })
        .select("id")
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace.id] });
      toast.success(`Contacto "${primaryRecipient.name}" criado automaticamente`);
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
      .or(`channel_metadata->>email.eq.${primaryRecipient.email},channel_metadata->>from_email.eq.${primaryRecipient.email}`)
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
          email: primaryRecipient.email,
          name: primaryRecipient.name,
          subject: subject || `Conversa com ${primaryRecipient.name}`,
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

    // RichTextEditor always produces HTML
    finalBody = finalBody || '';
    finalBody += meetingHtml;
    finalBody += attachHtml;
    if (includeSignature && signatureHtml) {
      finalBody += `<div style="margin-top: 1.5em;">${signatureHtml}</div>`;
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
    if (primaryRecipient.entityType === 'contact') entityRef.contact_id = primaryRecipient.entityId;
    if (primaryRecipient.entityType === 'company') entityRef.company_id = primaryRecipient.entityId;
    if (primaryRecipient.entityType === 'lead') entityRef.lead_id = primaryRecipient.entityId;

    await createEvent({
      calendar_id: selectedCalendarId,
      title: subject || `Reunião com ${primaryRecipient.name}`,
      description: `Reunião agendada via email com ${primaryRecipient.name} (${primaryRecipient.email})`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: meetingLocation || undefined,
      meeting_url: meetingUrl || undefined,
      status: 'confirmed',
      attendees: [{ id: '', name: primaryRecipient.name, email: primaryRecipient.email, status: 'invited' }],
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
    if (!body.trim() || body === '<p><br></p>') {
      toast.error("Por favor, escreva o conteúdo do email");
      return;
    }

    try {
      const { id: entityId, entityType } = await findOrCreateContact();
      const convId = await findOrCreateConversation(entityId, entityType);
      setConversationId(convId);

      const finalBody = buildFinalBody();

      await sendEmail.mutateAsync({
        connectionId: connection.id,
        conversationId: convId,
        to: primaryRecipient.email,
        subject: subject.trim(),
        body: finalBody,
        isHtml: true,
      });

      await createMeetingEvent();

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
    if (!body.trim() || body === '<p><br></p>') {
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
        recipientEmail: primaryRecipient.email,
        recipientName: primaryRecipient.name,
        subject: subject.trim(),
        body: finalBody,
        isHtml: true,
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
        preserveHtml: true,
      });
      setBody(result.translatedText);
      toast.success("Tradução aplicada");
    } catch {}
  };

  const handleTemplateApply = (content: string, templateSubject?: string) => {
    setBody(content);
    if (templateSubject && !subject) setSubject(templateSubject);
    toast.success("Template aplicado");
  };

  const handlePaymentLinkInsert = (html: string) => {
    setBody((prev) => prev + html);
  };

  const handleMergeTagInsert = (tag: string) => {
    setBody((prev) => prev + tag);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Add files as attachments (placeholder - actual upload handled by EmailAttachmentList)
      toast.info(`${files.length} ficheiro(s) detetado(s). Use o botão de anexos para carregar.`);
    }
  }, []);

  const htmlPreview = (() => {
    let preview = sanitizeForPreview(body || '');
    preview += buildAttachmentsHtml(attachments);
    if (includeSignature && signatureHtml) {
      preview += `<div style="margin-top: 1.5em; border-top: 1px solid #e5e7eb; padding-top: 1em;">${signatureHtml}</div>`;
    }
    return preview;
  })();

  const isBusy = sendEmail.isPending || scheduleEmail.isPending || isCreatingContact;
  const priorityConfig = PRIORITY_CONFIG[priority];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-5 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PenLine className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base">Novo Email</DialogTitle>
                  <DialogDescription className="text-xs">
                    {connection ? (
                      <span className="flex items-center gap-1">
                        <span className="text-muted-foreground">De:</span>
                        <span className="font-medium text-foreground">{senderDisplayName}</span>
                        <span className="text-muted-foreground">&lt;{senderEmail}&gt;</span>
                      </span>
                    ) : (
                      "Configure uma conta de email para enviar"
                    )}
                  </DialogDescription>
                </div>
              </div>

              {/* Priority selector */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("gap-1.5 h-7 text-xs", priorityConfig.color)}>
                      <Flag className="w-3.5 h-3.5" />
                      {priorityConfig.label}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(Object.entries(PRIORITY_CONFIG) as [EmailPriority, typeof priorityConfig][]).map(([key, cfg]) => (
                      <DropdownMenuItem key={key} onClick={() => setPriority(key)} className={cn("gap-2", cfg.color)}>
                        <Flag className="w-3.5 h-3.5" />
                        {cfg.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={readReceipt ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setReadReceipt(!readReceipt)}
                      >
                        <MailCheck className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Solicitar confirmação de leitura</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </DialogHeader>

          {/* No connection warning */}
          {!connectionLoading && !connection && (
            <div className="mx-5 mt-3 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Nenhuma conta de email conectada.{" "}
                <a href="/dashboard/settings" className="underline font-medium">Configurar agora</a>
              </span>
            </div>
          )}

          {/* Fields */}
          <div className="px-5 pt-3 space-y-2">
            {/* To field */}
            <div className="flex items-start gap-2">
              <Label className="w-14 text-sm text-muted-foreground shrink-0 pt-2">Para:</Label>
              <RecipientSearchInput
                recipients={recipients}
                onAdd={(entry) => setRecipients((prev) => [...prev, entry])}
                onRemove={(email) => setRecipients((prev) => prev.filter((r) => r.email !== email))}
              />
              {!showCcBcc && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2 shrink-0" onClick={() => setShowCcBcc(true)}>
                  CC/BCC
                </Button>
              )}
            </div>

            {/* CC/BCC fields */}
            {showCcBcc && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="w-14 text-sm text-muted-foreground shrink-0">CC:</Label>
                  <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="email1@ex.com, email2@ex.com" className="flex-1 h-8 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-14 text-sm text-muted-foreground shrink-0">BCC:</Label>
                  <Input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="email1@ex.com, email2@ex.com" className="flex-1 h-8 text-sm" />
                </div>
              </>
            )}

            {/* Subject field */}
            <div className="flex items-center gap-2">
              <Label htmlFor="email-subject" className="w-14 text-sm text-muted-foreground shrink-0">Assunto:</Label>
              <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email..." className="flex-1" />
            </div>
          </div>

          <Separator className="mt-2" />

          {/* Toolbar */}
          <div className="px-5 py-2 flex items-center justify-between gap-2 flex-wrap border-b">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Templates */}
              <InboxTemplatePanel
                channel="email"
                messages={[]}
                templateContext={effectiveTemplateContext}
                onApply={handleTemplateApply}
                trigger={
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                          <FileText className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs">Templates</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Templates de email</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                }
              />

              {/* AI Assist */}
              <AIEmailAssistPanel
                body={body}
                subject={subject}
                onApplyBody={setBody}
                onApplySubject={setSubject}
                disabled={isBusy}
              />

              <Separator orientation="vertical" className="h-6 mx-1" />

              {/* Attachments */}
              <EmailAttachmentList attachments={attachments} onChange={setAttachments} disabled={isBusy} />

              {/* Payment link */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowPaymentDialog(true)}>
                      <CreditCard className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Inserir link de pagamento</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Meeting scheduling */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showMeetingPanel ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8"
                      onClick={() => setShowMeetingPanel(!showMeetingPanel)}
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Agendar reunião</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Separator orientation="vertical" className="h-6 mx-1" />

              {/* Merge tags */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showMergeTags ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setShowMergeTags(!showMergeTags)}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs">Variáveis</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Variáveis dinâmicas</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Translation */}
              <Popover>
                <PopoverTrigger asChild>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8" disabled={translateEmail.isPending}>
                          {translateEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                          <span className="hidden sm:inline text-xs">Traduzir</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Traduzir email</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                <TabsTrigger value="write" className="text-xs h-7 px-3">
                  <PenLine className="w-3 h-3 mr-1" />
                  Escrever
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-7 px-3 gap-1">
                  <Eye className="w-3 h-3" />Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Merge tags bar */}
          {showMergeTags && (
            <div className="px-5 py-2 border-b bg-muted/20">
              <MergeTagsBar onInsert={handleMergeTagInsert} />
            </div>
          )}

          {/* Content area */}
          <div
            ref={dropRef}
            className={cn(
              "flex-1 min-h-0 relative",
              isDragging && "ring-2 ring-primary ring-inset bg-primary/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/5 pointer-events-none">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Upload className="w-5 h-5" />
                  Soltar ficheiros para anexar
                </div>
              </div>
            )}

            {activeTab === "write" ? (
              <EmailEditorProvider>
                <div className="h-full min-h-[300px] px-5 py-3">
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    placeholder="Escreva o conteúdo do seu email... (selecione texto para formatar)"
                    className="min-h-[280px] p-2"
                  />
                </div>
              </EmailEditorProvider>
            ) : (
              <ScrollArea className="h-full min-h-[300px]">
                <div className="bg-white text-gray-900 min-h-[300px]">
                  <div className="p-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Schedule picker */}
          {showSchedulePicker && (
            <div className="mx-5 mb-2 border rounded-lg p-3 bg-muted/30 space-y-3">
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

          {/* Meeting scheduling panel */}
          {showMeetingPanel && (
            <div className="mx-5 mb-2 border rounded-lg p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarPlus className="w-4 h-4" />Agendar Reunião
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setShowMeetingPanel(false); setMeetingDate(undefined); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {calendars.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0 w-20">Calendário:</Label>
                  <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                    <SelectTrigger className="h-8 text-sm flex-1">
                      <SelectValue placeholder="Selecionar calendário" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((cal) => (
                        <SelectItem key={cal.id} value={cal.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                            {cal.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 items-start flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[180px] justify-start text-left font-normal", !meetingDate && "text-muted-foreground")}>
                      {meetingDate ? format(meetingDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={meetingDate}
                      onSelect={setMeetingDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-[120px] h-8" />
                <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                  <SelectTrigger className="w-[120px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Input value={meetingLocation} onChange={(e) => setMeetingLocation(e.target.value)} placeholder="Local (opcional)" className="h-8 text-sm" />
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                  <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="URL videoconferência (opcional)" className="h-8 text-sm" />
                </div>
              </div>

              {meetingDate && (
                <div className="text-xs text-muted-foreground">
                  ✓ Ao enviar, será criado um evento no calendário selecionado com os detalhes da reunião.
                </div>
              )}
            </div>
          )}

          {/* Status bar */}
          <div className="px-5 py-2 border-t bg-muted/20 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {signatureHtml && (
                <div className="flex items-center gap-1.5">
                  <Switch id="sig-toggle" checked={includeSignature} onCheckedChange={setIncludeSignature} className="scale-75" />
                  <Label htmlFor="sig-toggle" className="text-xs cursor-pointer">Assinatura</Label>
                </div>
              )}
              <Badge variant="outline" className="text-[10px]">HTML</Badge>
              {attachments.length > 0 && (
                <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{attachments.length} anexo(s)</span>
              )}
              {priority !== 'normal' && (
                <Badge variant={priority === 'urgent' ? 'destructive' : 'secondary'} className="text-[10px] gap-1">
                  <Flag className="w-2.5 h-2.5" />{PRIORITY_CONFIG[priority].label}
                </Badge>
              )}
              {readReceipt && (
                <span className="flex items-center gap-1"><MailCheck className="w-3 h-3" />Confirmação de leitura</span>
              )}
            </div>
            <span className="text-muted-foreground/60">
              {body.replace(/<[^>]*>/g, '').length} caracteres
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>

            <div className="flex items-center gap-2">
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
                  <Button onClick={handleSend} disabled={isBusy || !connection} className="rounded-r-none gap-2">
                    {sendEmail.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />A enviar...</>
                    ) : (
                      <><Send className="w-4 h-4" />Enviar</>
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
        recipientName={primaryRecipient?.name}
        onSubjectSuggestion={(s) => { if (!subject.trim()) setSubject(s); }}
      />
    </>
  );
}
