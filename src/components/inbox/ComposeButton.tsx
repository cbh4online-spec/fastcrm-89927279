import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Mail, Phone, Instagram, Facebook, Globe, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle, Search, User, Users, X, ChevronDown, ChevronUp, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailConnections } from "@/hooks/useEmailConnection";
import { useEmailSignature } from "@/hooks/useEmailSignature";
import { useWorkspaceGHLConfig } from "@/hooks/useWorkspaceGHLConfig";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { useTwilioConnection } from "@/hooks/useTwilioConnection";
import { useContacts } from "@/hooks/useContacts";
import { useLeads } from "@/hooks/useLeads";
import { toast } from "sonner";
import { QuickGHLChannelDialog, GHLChannel } from "./QuickGHLChannelDialog";
import { QuickEvolutionWhatsAppDialog } from "./QuickEvolutionWhatsAppDialog";
import { QuickInstagramDialog } from "./QuickInstagramDialog";
import { QuickTwilioSMSDialog } from "./QuickTwilioSMSDialog";
import { useWhatsAppQRConnection } from "@/hooks/useWhatsAppQRConnection";

interface RecipientSuggestion {
  id: string;
  name: string;
  email: string;
  type: "contact" | "lead";
}

function RecipientAutocomplete({
  value,
  onSelect,
  onManualEmail,
  onClear,
}: {
  value: { id?: string; name: string; email: string; type?: "contact" | "lead" } | null;
  onSelect: (s: RecipientSuggestion) => void;
  onManualEmail: (email: string, name: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { contacts, isLoading: contactsLoading } = useContacts();
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const lowerSearch = search.toLowerCase();
    const results: RecipientSuggestion[] = [];

    (contacts || []).forEach((c) => {
      if (
        c.email &&
        (c.name?.toLowerCase().includes(lowerSearch) ||
          c.email?.toLowerCase().includes(lowerSearch))
      ) {
        results.push({ id: c.id, name: c.name, email: c.email, type: "contact" });
      }
    });

    (leads || []).forEach((l) => {
      if (
        l.email &&
        (l.name?.toLowerCase().includes(lowerSearch) ||
          l.email?.toLowerCase().includes(lowerSearch))
      ) {
        results.push({ id: l.id, name: l.name, email: l.email, type: "lead" });
      }
    });

    return results.slice(0, 10);
  }, [search, contacts, leads]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{value.name}</span>
            {value.type && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {value.type === "contact" ? "Contacto" : "Lead"}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate block">{value.email}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Pesquisar contacto ou digitar email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => search.length >= 2 && setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.includes("@")) {
              e.preventDefault();
              const namePart = search.split("@")[0];
              onManualEmail(search.trim(), namePart);
              setSearch("");
              setShowDropdown(false);
            }
          }}
          className="pl-8"
        />
      </div>

      {showDropdown && search.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md">
          {contactsLoading || leadsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length > 0 ? (
            <ScrollArea className="max-h-[200px]">
              <div className="p-1">
                {suggestions.map((s) => (
                  <button
                    key={`${s.type}-${s.id}`}
                    className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-md hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onSelect(s);
                      setSearch("");
                      setShowDropdown(false);
                    }}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                      s.type === "contact" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                    )}>
                      {s.type === "contact" ? <User className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {s.type === "contact" ? "Contacto" : "Lead"}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {search.includes("@") ? (
                <span>
                  Pressione <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> para usar <strong>{search}</strong>
                </span>
              ) : (
                "Nenhum resultado. Digite um email completo para enviar manualmente."
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickComposeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: emailConnections } = useEmailConnections();
  const { signatureHtml } = useEmailSignature();

  const [recipient, setRecipient] = useState<{
    id?: string;
    name: string;
    email: string;
    type?: "contact" | "lead";
  } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const activeConnection = emailConnections?.find(c => c.is_active);

  const handleSend = async () => {
    if (!recipient?.email || !subject.trim() || !body.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!activeConnection) {
      toast.error("Configure uma conexão de email nas Definições > Canais");
      return;
    }

    setIsSending(true);
    try {
      let entityId: string | null = recipient.id || null;
      let entityType: "contact" | "lead" = recipient.type || "lead";

      // If no entity was selected from autocomplete, find or create
      if (!entityId) {
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("workspace_id", currentWorkspace?.id)
          .eq("email", recipient.email)
          .maybeSingle();

        if (existingContact) {
          entityId = existingContact.id;
          entityType = "contact";
        } else {
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("workspace_id", currentWorkspace?.id)
            .eq("email", recipient.email)
            .maybeSingle();

          if (existingLead) {
            entityId = existingLead.id;
            entityType = "lead";
          } else {
            const { data: newLead, error: createError } = await supabase
              .from("leads")
              .insert([{
                workspace_id: currentWorkspace?.id,
                email: recipient.email,
                name: recipient.name || recipient.email.split("@")[0],
                source: "email" as const,
                status: "new" as const,
                created_by: user?.id,
              }])
              .select("id")
              .single();

            if (createError) throw createError;
            entityId = newLead.id;
            entityType = "lead";
          }
        }
      }

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: currentWorkspace?.id,
          channel: "email",
          status: "open",
          last_message_at: new Date().toISOString(),
          ...(entityType === "lead" && entityId ? { lead_id: entityId } : {}),
          ...(entityType === "contact" && entityId ? { contact_id: entityId } : {}),
        })
        .select("id")
        .single();

      if (convError) throw convError;

      const fullBody = signatureHtml
        ? `${body.trim()}<br/><br/>--<br/>${signatureHtml}`
        : body.trim();

      const { error } = await supabase.functions.invoke("email-send", {
        body: {
          connectionId: activeConnection.id,
          workspaceId: currentWorkspace?.id,
          conversationId: conversation.id,
          to: recipient.email,
          subject: subject.trim(),
          body: fullBody,
          isHtml: !!signatureHtml,
          ...(cc.trim() ? { cc: cc.trim() } : {}),
          ...(bcc.trim() ? { bcc: bcc.trim() } : {}),
        },
      });

      if (error) throw error;

      toast.success("Email enviado com sucesso!");
      onOpenChange(false);
      setRecipient(null);
      setSubject("");
      setBody("");
      setCc("");
      setBcc("");
      setShowCcBcc(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Erro ao enviar email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Novo Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!activeConnection && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
              ⚠️ Nenhuma conexão de email ativa. Configure em Definições → Canais → Email.
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Para *</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground gap-1 px-2"
                onClick={() => setShowCcBcc(!showCcBcc)}
              >
                {showCcBcc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Cc / Bcc
              </Button>
            </div>
            <RecipientAutocomplete
              value={recipient}
              onSelect={(s) => setRecipient({ id: s.id, name: s.name, email: s.email, type: s.type })}
              onManualEmail={(email, name) => setRecipient({ name, email })}
              onClear={() => setRecipient(null)}
            />
          </div>

          {showCcBcc && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cc">Cc</Label>
                <Input
                  id="cc"
                  placeholder="email@exemplo.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bcc">Bcc</Label>
                <Input
                  id="bcc"
                  placeholder="email@exemplo.com"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              placeholder="Assunto do email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensagem *</Label>
            <Textarea
              id="body"
              placeholder="Escreva a sua mensagem..."
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {signatureHtml && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSignature className="h-3.5 w-3.5" />
              <span>A assinatura será incluída automaticamente</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !recipient?.email || !subject.trim() || !body.trim() || !activeConnection}
            className="gap-2 bg-green-500 hover:bg-green-600"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ComposeButtonProps {
  className?: string;
  variant?: "default" | "floating";
}

export function ComposeButton({ className, variant = "default" }: ComposeButtonProps) {
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [showGHLDialog, setShowGHLDialog] = useState(false);
  const [showEvolutionWhatsApp, setShowEvolutionWhatsApp] = useState(false);
  const [showInstagramDialog, setShowInstagramDialog] = useState(false);
  const [showTwilioSMS, setShowTwilioSMS] = useState(false);
  const [selectedGHLChannel, setSelectedGHLChannel] = useState<GHLChannel>("sms");

  // Check connection status
  const { data: emailConnections } = useEmailConnections();
  const { isConfigured: isGHLConfigured } = useWorkspaceGHLConfig();
  const { data: instagramConnection } = useInstagramConnection();
  const { data: whatsappQRConnection } = useWhatsAppQRConnection();
  const { data: twilioConnection } = useTwilioConnection();

  const hasEmailConnection = emailConnections?.some(c => c.is_active);
  const hasInstagramConnection = instagramConnection?.is_active;
  const hasTwilioSMS = twilioConnection?.is_active;
  const hasWhatsAppQR = whatsappQRConnection?.status === "connected";

  const channels = [
    { 
      id: "email", 
      label: "Novo Email", 
      icon: Mail, 
      color: "text-blue-500 bg-blue-500/10", 
      available: true,
      configured: hasEmailConnection,
    },
    { 
      id: "whatsapp", 
      label: "WhatsApp", 
      icon: Phone, 
      color: "text-green-500 bg-green-500/10", 
      available: true,
      configured: hasWhatsAppQR,
    },
    { 
      id: "instagram", 
      label: "Instagram DM", 
      icon: Instagram, 
      color: "text-pink-500 bg-pink-500/10", 
      available: true,
      configured: hasInstagramConnection,
    },
    { 
      id: "facebook", 
      label: "Facebook Messenger", 
      icon: Facebook, 
      color: "text-indigo-500 bg-indigo-500/10", 
      available: true,
      configured: isGHLConfigured,
    },
    { 
      id: "sms", 
      label: "SMS", 
      icon: MessageSquare, 
      color: "text-purple-500 bg-purple-500/10", 
      available: true,
      configured: hasTwilioSMS || isGHLConfigured,
    },
    { 
      id: "webchat", 
      label: "Website Chat", 
      icon: Globe, 
      color: "text-cyan-500 bg-cyan-500/10", 
      available: false,
      configured: false,
    },
  ];

  const handleChannelSelect = (channelId: string) => {
    switch (channelId) {
      case "email":
        setShowEmailCompose(true);
        break;
      case "whatsapp":
        setShowEvolutionWhatsApp(true);
        break;
      case "sms":
        if (hasTwilioSMS) {
          setShowTwilioSMS(true);
        } else {
          setSelectedGHLChannel("sms");
          setShowGHLDialog(true);
        }
        break;
      case "facebook":
        setSelectedGHLChannel("facebook");
        setShowGHLDialog(true);
        break;
      case "instagram":
        setShowInstagramDialog(true);
        break;
    }
  };

  const renderChannelItem = (channel: typeof channels[0]) => {
    const Icon = channel.icon;
    return (
      <DropdownMenuItem
        key={channel.id}
        onClick={() => handleChannelSelect(channel.id)}
        disabled={!channel.available}
        className="gap-3"
      >
        <div className={cn("p-1.5 rounded", channel.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="flex-1">{channel.label}</span>
        {!channel.available ? (
          <span className="text-xs text-muted-foreground">Em breve</span>
        ) : channel.configured ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
      </DropdownMenuItem>
    );
  };

  if (variant === "floating") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
                "bg-green-500 hover:bg-green-600 text-white",
                className
              )}
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Nova Mensagem</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {channels.map(renderChannelItem)}
          </DropdownMenuContent>
        </DropdownMenu>

        <QuickComposeDialog
          open={showEmailCompose}
          onOpenChange={setShowEmailCompose}
        />
        <QuickGHLChannelDialog
          open={showGHLDialog}
          onOpenChange={setShowGHLDialog}
          channel={selectedGHLChannel}
        />
        <QuickEvolutionWhatsAppDialog
          open={showEvolutionWhatsApp}
          onOpenChange={setShowEvolutionWhatsApp}
        />
        <QuickInstagramDialog
          open={showInstagramDialog}
          onOpenChange={setShowInstagramDialog}
        />
        <QuickTwilioSMSDialog
          open={showTwilioSMS}
          onOpenChange={setShowTwilioSMS}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className={cn(
              "gap-2 bg-green-500 hover:bg-green-600 text-white",
              className
            )}
          >
            <Plus className="w-4 h-4" />
            <span>Nova Mensagem</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Escolher Canal</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {channels.map(renderChannelItem)}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickComposeDialog
        open={showEmailCompose}
        onOpenChange={setShowEmailCompose}
      />
      <QuickGHLChannelDialog
        open={showGHLDialog}
        onOpenChange={setShowGHLDialog}
        channel={selectedGHLChannel}
      />
      <QuickEvolutionWhatsAppDialog
        open={showEvolutionWhatsApp}
        onOpenChange={setShowEvolutionWhatsApp}
      />
      <QuickInstagramDialog
        open={showInstagramDialog}
        onOpenChange={setShowInstagramDialog}
      />
      <QuickTwilioSMSDialog
        open={showTwilioSMS}
        onOpenChange={setShowTwilioSMS}
      />
    </>
  );
}
