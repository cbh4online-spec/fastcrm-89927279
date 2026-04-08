import { useState, useRef, useEffect, useCallback } from "react";
import { sanitizeHtml } from "@/utils/sanitize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  Languages,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Paperclip,
  X,
  CreditCard,
  Sparkles,
  CalendarPlus,
  MapPin,
  Video,
  Flag,
  MailCheck,
  Upload,
  User,
  Mail,
  Settings2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addMinutes } from "date-fns";
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
import { RichTextEditor } from "@/components/email-builder/RichTextEditor";
import { EmailEditorProvider } from "@/contexts/EmailEditorContext";
import { MergeTagsBar } from "@/components/html-email-editor/MergeTagsBar";
import { useEntitySearch, SearchableEntity } from "@/hooks/useEntitySearch";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────

export interface SimpleEmailComposerProps {
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
  onCancel?: () => void;
  autoCreateContact?: boolean;
}

type EmailPriority = 'normal' | 'high' | 'urgent';

interface RecipientEntry {
  email: string;
  name: string;
  entityType: 'contact' | 'company' | 'lead';
  entityId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function buildAttachmentsHtml(attachments: EmailAttachment[]): string {
  if (attachments.length === 0) return "";
  const links = attachments.map(a => `<a href="${a.url}" style="color: #0066cc;">${a.name}</a>`).join(" · ");
  return `<div style="margin-top: 1.5em; padding-top: 1em; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">📎 Anexos: ${links}</div>`;
}

// ─── Recipient Search ────────────────────────────────────────────────────

function RecipientSearchInput({
  recipients,
  onAdd,
  onRemove,
}: {
  recipients: RecipientEntry[];
  onAdd: (entry: RecipientEntry) => void;
  onRemove: (email: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { searchContacts, searchLeads, isLoading } = useEntitySearch();
  const [results, setResults] = useState<SearchableEntity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    const [contacts, leads] = await Promise.all([searchContacts(q), searchLeads(q)]);
    setResults([...contacts, ...leads].filter(e => e.email && !recipients.some(r => r.email === e.email)));
  }, [searchContacts, searchLeads, recipients]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length >= 2) { handleSearch(query); setShowDropdown(true); }
      else { setResults([]); setShowDropdown(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, handleSearch]);

  const handleSelect = (entity: SearchableEntity) => {
    onAdd({ email: entity.email!, name: entity.name, entityType: entity.type, entityId: entity.id });
    setQuery(""); setResults([]); setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.includes('@') && !results.length) {
      e.preventDefault();
      onAdd({ email: query.trim(), name: query.split('@')[0], entityType: 'contact', entityId: 'new' });
      setQuery("");
    }
    if (e.key === 'Backspace' && !query && recipients.length > 0) {
      onRemove(recipients[recipients.length - 1].email);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-shadow">
        {recipients.map(r => (
          <Badge key={r.email} variant="secondary" className="text-xs gap-1.5 h-7 shrink-0 pl-2">
            <User className="w-3 h-3" />
            <span>{r.name}</span>
            <span className="text-muted-foreground">({r.email})</span>
            <button type="button" onClick={() => onRemove(r.email)} className="ml-0.5 hover:text-destructive rounded-full p-0.5" aria-label={`Remover ${r.name}`}>
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={recipients.length === 0 ? "Escolhe quem vai receber este email..." : "Adicionar mais..."}
          className="flex-1 min-w-[160px] h-7 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Destinatário"
        />
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
          {results.map(entity => (
            <button
              key={entity.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent text-left transition-colors"
              onMouseDown={e => e.preventDefault()}
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
            {query.includes('@') ? 'Pressiona Enter para adicionar este email.' : 'Nenhum resultado. Escreve um email válido.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Success Screen ──────────────────────────────────────────────────────

function EmailSentSuccess({ recipientName, onClose }: { recipientName: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6 gap-4"
    >
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-semibold">Email enviado!</h3>
        <p className="text-sm text-muted-foreground">
          O teu email para <span className="font-medium text-foreground">{recipientName}</span> foi enviado com sucesso.
        </p>
      </div>
      <Button variant="outline" onClick={onClose} className="mt-2">
        Fechar
      </Button>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function SimpleEmailComposer({
  recipient,
  defaultSubject = "",
  defaultBody = "",
  templateContext,
  onSent,
  onCancel,
  autoCreateContact = false,
}: SimpleEmailComposerProps) {
  // ── Core fields (3 steps) ──
  const [recipients, setRecipients] = useState<RecipientEntry[]>([{
    email: recipient.email,
    name: recipient.name,
    entityType: recipient.entityType,
    entityId: recipient.entityId,
  }]);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sent, setSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ── Advanced options ──
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const [readReceipt, setReadReceipt] = useState(false);
  const [showMergeTags, setShowMergeTags] = useState(false);
  const [showMeetingPanel, setShowMeetingPanel] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date | undefined>();
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [isCreatingContact, setIsCreatingContact] = useState(false);

  // ── Validation ──
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Hooks ──
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: connection, isLoading: connectionLoading } = useActiveEmailConnection();
  const sendEmail = useSendEmail();
  const translateEmail = useTranslateEmail();
  const { signatureHtml } = useEmailSignature();
  const scheduleEmail = useScheduleEmail();
  const { calendars } = useCalendars();
  const { createEvent } = useCalendarEvents(selectedCalendarId ? [selectedCalendarId] : []);

  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendarId) setSelectedCalendarId(calendars[0].id);
  }, [calendars, selectedCalendarId]);

  const effectiveTemplateContext: VariableContext = templateContext || {
    contact: { name: recipient.name, email: recipient.email },
  };

  const primaryRecipient = recipients[0] || recipient;
  const isBusy = sendEmail.isPending || scheduleEmail.isPending || isCreatingContact;

  // ── Validation ──
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (recipients.length === 0) newErrors.recipients = "Adiciona pelo menos um destinatário.";
    if (!subject.trim()) newErrors.subject = "O assunto não pode ficar vazio.";
    if (!body.trim() || body === '<p><br></p>') newErrors.body = "Escreve uma mensagem antes de enviar.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Contact / Conversation helpers ──
  const findOrCreateContact = async (): Promise<{ id: string; entityType: 'contact' | 'lead' | 'company' }> => {
    if (!currentWorkspace || !workspaceClient || !user) throw new Error("Workspace não disponível");
    if (primaryRecipient.entityId && primaryRecipient.entityId !== "new") {
      return { id: primaryRecipient.entityId, entityType: primaryRecipient.entityType };
    }
    const { data: existingContact } = await workspaceClient.from("contacts").select("id").eq("workspace_id", currentWorkspace.id).eq("email", primaryRecipient.email).maybeSingle();
    if (existingContact) return { id: existingContact.id, entityType: "contact" };
    const { data: existingLead } = await workspaceClient.from("leads").select("id").eq("workspace_id", currentWorkspace.id).eq("email", primaryRecipient.email).maybeSingle();
    if (existingLead) return { id: existingLead.id, entityType: "lead" };
    if (autoCreateContact) {
      setIsCreatingContact(true);
      const { data: newContact, error } = await workspaceClient.from("contacts").insert({
        workspace_id: currentWorkspace.id, created_by: user.id,
        name: primaryRecipient.name || primaryRecipient.email.split("@")[0],
        email: primaryRecipient.email, tags: ["criado-via-email"],
      }).select("id").single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace.id] });
      setIsCreatingContact(false);
      return { id: newContact.id, entityType: "contact" };
    }
    throw new Error("Nenhum contacto encontrado com este email");
  };

  const findOrCreateConversation = async (entityId: string, entityType: 'contact' | 'lead' | 'company'): Promise<string> => {
    if (!currentWorkspace || !workspaceClient) throw new Error("Workspace não disponível");
    const { data: existing } = await workspaceClient.from("conversations").select("id").eq("workspace_id", currentWorkspace.id).eq("channel", "email")
      .or(`channel_metadata->>email.eq.${primaryRecipient.email},channel_metadata->>from_email.eq.${primaryRecipient.email}`)
      .order("last_message_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) return existing.id;
    const entityRef: Record<string, string> = {};
    entityRef[`${entityType}_id`] = entityId;
    const { data: newConv, error } = await workspaceClient.from("conversations").insert({
      workspace_id: currentWorkspace.id, channel: "email", status: "open",
      channel_metadata: { email: primaryRecipient.email, name: primaryRecipient.name, subject: subject || `Conversa com ${primaryRecipient.name}` },
      ...entityRef,
    }).select("id").single();
    if (error) throw error;
    return newConv.id;
  };

  const buildMeetingHtml = (): string => {
    if (!showMeetingPanel || !meetingDate) return "";
    const [h, m] = meetingTime.split(":").map(Number);
    const start = new Date(meetingDate); start.setHours(h, m, 0, 0);
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
    let finalBody = body.trim() || '';
    finalBody += buildMeetingHtml();
    finalBody += buildAttachmentsHtml(attachments);
    if (includeSignature && signatureHtml) {
      finalBody += `<div style="margin-top: 1.5em;">${signatureHtml}</div>`;
    }
    return finalBody;
  };

  const createMeetingEvent = async () => {
    if (!showMeetingPanel || !meetingDate || !selectedCalendarId) return;
    const [h, m] = meetingTime.split(":").map(Number);
    const start = new Date(meetingDate); start.setHours(h, m, 0, 0);
    const end = addMinutes(start, parseInt(meetingDuration));
    const entityRef: Record<string, string> = {};
    if (primaryRecipient.entityType === 'contact') entityRef.contact_id = primaryRecipient.entityId;
    if (primaryRecipient.entityType === 'company') entityRef.company_id = primaryRecipient.entityId;
    if (primaryRecipient.entityType === 'lead') entityRef.lead_id = primaryRecipient.entityId;
    await createEvent({
      calendar_id: selectedCalendarId,
      title: subject || `Reunião com ${primaryRecipient.name}`,
      description: `Reunião agendada via email com ${primaryRecipient.name} (${primaryRecipient.email})`,
      start_time: start.toISOString(), end_time: end.toISOString(),
      location: meetingLocation || undefined, meeting_url: meetingUrl || undefined,
      status: 'confirmed',
      attendees: [{ id: '', name: primaryRecipient.name, email: primaryRecipient.email, status: 'invited' }],
      ...entityRef,
    });
  };

  // ── Send ──
  const handleSend = async () => {
    if (!validate()) return;
    if (!connection) {
      toast.error("Configura uma conta de email primeiro nas definições.");
      return;
    }
    try {
      const { id: entityId, entityType } = await findOrCreateContact();
      const convId = await findOrCreateConversation(entityId, entityType);
      const finalBody = buildFinalBody();
      await sendEmail.mutateAsync({
        connectionId: connection.id, conversationId: convId,
        to: primaryRecipient.email, subject: subject.trim(), body: finalBody, isHtml: true,
      });
      await createMeetingEvent();
      setSent(true);
      onSent?.();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(`Não foi possível enviar o email. ${error.message || "Tenta novamente."}`);
    }
  };

  const handleScheduleSend = async () => {
    if (!validate()) return;
    if (!connection || !scheduledDate) return;
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduleAt = new Date(scheduledDate); scheduleAt.setHours(hours, minutes, 0, 0);
    if (scheduleAt <= new Date()) { toast.error("Escolhe uma data no futuro."); return; }
    try {
      const { id: entityId, entityType } = await findOrCreateContact();
      const convId = await findOrCreateConversation(entityId, entityType);
      const finalBody = buildFinalBody();
      await scheduleEmail.mutateAsync({
        connectionId: connection.id, conversationId: convId,
        recipientEmail: primaryRecipient.email, recipientName: primaryRecipient.name,
        subject: subject.trim(), body: finalBody, isHtml: true,
        attachments: attachments.map(a => ({ name: a.name, url: a.url })),
        scheduledFor: scheduleAt,
      });
      toast.success(`Email agendado para ${format(scheduleAt, "dd/MM/yyyy HH:mm")}`);
      onSent?.(); onCancel?.();
    } catch (error: any) {
      toast.error(`Não foi possível agendar. ${error.message || "Tenta novamente."}`);
    }
  };

  const handleTranslate = async (targetLanguage: TranslationLanguage) => {
    if (!body.trim()) { toast.error("Escreve algum conteúdo primeiro."); return; }
    try {
      const result = await translateEmail.mutateAsync({ text: body, targetLanguage, makeNatural: true, preserveVariables: true, preserveHtml: true });
      setBody(result.translatedText);
      toast.success("Tradução aplicada!");
    } catch {}
  };

  const handleTemplateApply = (content: string, templateSubject?: string) => {
    setBody(content);
    if (templateSubject && !subject) setSubject(templateSubject);
    toast.success("Template aplicado!");
  };

  const handleMergeTagInsert = (tag: string) => setBody(prev => prev + tag);

  // ── Keyboard ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
  };

  // ── Success state ──
  if (sent) {
    return <EmailSentSuccess recipientName={primaryRecipient.name} onClose={() => onCancel?.()} />;
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Connection status */}
      {!connectionLoading && !connection && (
        <div className="mx-1 mb-3 flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
            Precisas de configurar uma conta de email para enviar.
          </p>
          <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => window.location.href = "/dashboard/settings/integrations"}>
            <Mail className="w-3.5 h-3.5 mr-1.5" />Configurar
          </Button>
        </div>
      )}
      {connectionLoading && (
        <div className="mx-1 mb-3 flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />A verificar ligação...
        </div>
      )}

      {/* ━━━ STEP 1: Para quem? ━━━ */}
      <div className="space-y-1.5 mb-4">
        <Label htmlFor="recipient-field" className="text-sm font-medium flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
          Para quem?
        </Label>
        <RecipientSearchInput
          recipients={recipients}
          onAdd={entry => setRecipients(prev => [...prev, entry])}
          onRemove={email => setRecipients(prev => prev.filter(r => r.email !== email))}
        />
        {errors.recipients && <p className="text-xs text-destructive mt-1">{errors.recipients}</p>}
      </div>

      {/* ━━━ STEP 2: Qual assunto? ━━━ */}
      <div className="space-y-1.5 mb-4">
        <Label htmlFor="subject-field" className="text-sm font-medium flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
          Qual é o assunto?
        </Label>
        <Input
          id="subject-field"
          value={subject}
          onChange={e => { setSubject(e.target.value); if (errors.subject) setErrors(prev => ({ ...prev, subject: '' })); }}
          placeholder="Escreve um assunto curto e claro..."
          className={cn("h-11", errors.subject && "border-destructive")}
          aria-describedby={errors.subject ? "subject-error" : undefined}
        />
        {errors.subject && <p id="subject-error" className="text-xs text-destructive">{errors.subject}</p>}
      </div>

      {/* ━━━ STEP 3: Qual mensagem? ━━━ */}
      <div className="space-y-1.5 mb-4 flex-1 min-h-0 flex flex-col">
        <Label htmlFor="body-field" className="text-sm font-medium flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
          Qual é a mensagem?
        </Label>
        <div className={cn("flex-1 min-h-[200px] rounded-lg border", errors.body && "border-destructive")}>
          <EmailEditorProvider>
            <RichTextEditor
              value={body}
              onChange={val => { setBody(val); if (errors.body) setErrors(prev => ({ ...prev, body: '' })); }}
              placeholder="Escreve a tua mensagem aqui..."
              className="min-h-[180px] p-3"
            />
          </EmailEditorProvider>
        </div>
        {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
      </div>

      {/* ━━━ Attachments quick action ━━━ */}
      {attachments.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Paperclip className="w-3.5 h-3.5" />
          <span>{attachments.length} ficheiro(s) anexado(s)</span>
        </div>
      )}

      {/* ━━━ MORE OPTIONS (collapsible) ━━━ */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground w-full justify-start h-9 px-2">
            {advancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Settings2 className="w-4 h-4" />
            <span className="text-sm">Mais opções</span>
            {(attachments.length > 0 || priority !== 'normal' || showSchedulePicker || showMeetingPanel) && (
              <Badge variant="secondary" className="text-[10px] ml-auto">{
                [attachments.length > 0 && 'Anexos', priority !== 'normal' && 'Prioridade', showSchedulePicker && 'Agendar', showMeetingPanel && 'Reunião'].filter(Boolean).join(', ')
              }</Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-3 pb-1 space-y-4 border-t mt-2">
            {/* Attachments */}
            <div className="flex items-center gap-3">
              <EmailAttachmentList attachments={attachments} onChange={setAttachments} disabled={isBusy} />
              <span className="text-sm text-muted-foreground">Anexar ficheiro</span>
            </div>

            {/* Templates */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setTemplatesOpen(true)}>
                <FileText className="w-4 h-4" />Inserir template
              </Button>
              <InboxTemplatePanel
                channel="email" messages={[]} templateContext={effectiveTemplateContext}
                onApply={handleTemplateApply} externalOpen={templatesOpen} onExternalOpenChange={setTemplatesOpen}
              />
            </div>

            {/* AI Assist */}
            <div className="flex items-center gap-2">
              <AIEmailAssistPanel body={body} subject={subject} onApplyBody={setBody} onApplySubject={setSubject} disabled={isBusy} />
              <span className="text-sm text-muted-foreground">Assistente IA</span>
            </div>

            {/* Translation */}
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-8" disabled={translateEmail.isPending}>
                    {translateEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                    Traduzir email
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-1">
                    <p className="text-sm font-medium mb-2">Traduzir para:</p>
                    {LANGUAGE_OPTIONS.map(lang => (
                      <Button key={lang.value} variant="ghost" className="justify-start text-sm h-8 w-full" onClick={() => handleTranslate(lang.value)} disabled={translateEmail.isPending}>
                        <span className="mr-2">{lang.flag}</span>{lang.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            {/* Priority */}
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-24 shrink-0">Prioridade:</Label>
              <Select value={priority} onValueChange={v => setPriority(v as EmailPriority)}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal"><span className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-muted-foreground" />Normal</span></SelectItem>
                  <SelectItem value="high"><span className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-amber-500" />Alta</span></SelectItem>
                  <SelectItem value="urgent"><span className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-destructive" />Urgente</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Read receipt */}
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-24 shrink-0">Confirmação:</Label>
              <div className="flex items-center gap-2">
                <Switch id="read-receipt" checked={readReceipt} onCheckedChange={setReadReceipt} />
                <Label htmlFor="read-receipt" className="text-sm cursor-pointer">Pedir confirmação de leitura</Label>
              </div>
            </div>

            {/* Signature */}
            {signatureHtml && (
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-24 shrink-0">Assinatura:</Label>
                <div className="flex items-center gap-2">
                  <Switch id="sig-toggle" checked={includeSignature} onCheckedChange={setIncludeSignature} />
                  <Label htmlFor="sig-toggle" className="text-sm cursor-pointer">Incluir assinatura</Label>
                </div>
              </div>
            )}

            {/* CC/BCC */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-24 shrink-0">CC:</Label>
                <Input value={cc} onChange={e => setCc(e.target.value)} placeholder="email@exemplo.com" className="flex-1 h-8 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-24 shrink-0">BCC:</Label>
                <Input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="email@exemplo.com" className="flex-1 h-8 text-sm" />
              </div>
            </div>

            <Separator />

            {/* Schedule */}
            <div>
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setShowSchedulePicker(!showSchedulePicker)}>
                <Clock className="w-4 h-4" />Agendar envio
              </Button>
              {showSchedulePicker && (
                <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex gap-3 items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left", !scheduledDate && "text-muted-foreground")}>
                          {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Escolher data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-[110px] h-8" />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowSchedulePicker(false); setScheduledDate(undefined); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Meeting */}
            <div>
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setShowMeetingPanel(!showMeetingPanel)}>
                <CalendarPlus className="w-4 h-4" />Agendar reunião
              </Button>
              {showMeetingPanel && (
                <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-3">
                  {calendars.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0 w-20">Calendário:</Label>
                      <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                        <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          {calendars.map(cal => (
                            <SelectItem key={cal.id} value={cal.id}>
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                                {cal.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-3 items-center flex-wrap">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left", !meetingDate && "text-muted-foreground")}>
                          {meetingDate ? format(meetingDate, "dd/MM/yyyy") : "Escolher data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={meetingDate} onSelect={setMeetingDate} disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-[110px] h-8" />
                    <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                      <SelectTrigger className="w-[110px] h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1h30</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3 items-center flex-wrap">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="Local" className="h-8 text-sm" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                      <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="URL videoconferência" className="h-8 text-sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Merge tags */}
            <div>
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setShowMergeTags(!showMergeTags)}>
                <Sparkles className="w-4 h-4" />Variáveis dinâmicas
              </Button>
              {showMergeTags && (
                <div className="mt-2 p-2 bg-muted/30 rounded-lg">
                  <MergeTagsBar onInsert={handleMergeTagInsert} />
                </div>
              )}
            </div>

            {/* Payment link */}
            <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setShowPaymentDialog(true)}>
              <CreditCard className="w-4 h-4" />Inserir link de pagamento
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ━━━ SEND BUTTON ━━━ */}
      <div className="flex items-center justify-between pt-2 border-t mt-auto">
        <Button variant="ghost" size="sm" onClick={onCancel} tabIndex={-1}>
          Cancelar
        </Button>

        <div className="flex items-center gap-2">
          {connection && (
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {connection.email_address}
            </span>
          )}

          {showSchedulePicker && scheduledDate ? (
            <Button onClick={handleScheduleSend} disabled={isBusy || !connection} size="lg" className="gap-2 min-w-[160px]">
              {scheduleEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Agendar para {format(scheduledDate, "dd/MM")}
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={isBusy || !connection} size="lg" className="gap-2 min-w-[160px] text-base font-semibold">
              {sendEmail.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" />A enviar...</>
              ) : (
                <><Send className="w-5 h-5" />Enviar Email</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Payment dialog */}
      <InsertPaymentLinkDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onInsert={html => setBody(prev => prev + html)}
        recipientName={primaryRecipient?.name}
        onSubjectSuggestion={s => { if (!subject.trim()) setSubject(s); }}
      />
    </div>
  );
}
