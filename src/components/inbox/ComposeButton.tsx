import { useState } from "react";
import { Plus, Mail, Phone, Instagram, Facebook, Globe, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useWorkspaceGHLConfig } from "@/hooks/useWorkspaceGHLConfig";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { toast } from "sonner";
import { QuickGHLChannelDialog, GHLChannel } from "./QuickGHLChannelDialog";
import { QuickInstagramDialog } from "./QuickInstagramDialog";

interface ComposeButtonProps {
  className?: string;
  variant?: "default" | "floating";
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
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const activeConnection = emailConnections?.find(c => c.is_active);

  const handleSend = async () => {
    if (!recipientEmail.trim() || !subject.trim() || !body.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!activeConnection) {
      toast.error("Configure uma conexão de email nas Definições > Canais");
      return;
    }

    setIsSending(true);
    try {
      // Find or create contact/lead
      let entityId: string | null = null;
      let entityType: 'contact' | 'lead' = 'lead';

      // Check if contact exists
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", currentWorkspace?.id)
        .eq("email", recipientEmail.trim())
        .maybeSingle();

      if (existingContact) {
        entityId = existingContact.id;
        entityType = 'contact';
      } else {
        // Check if lead exists
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("workspace_id", currentWorkspace?.id)
          .eq("email", recipientEmail.trim())
          .maybeSingle();

        if (existingLead) {
          entityId = existingLead.id;
          entityType = 'lead';
        } else {
          // Create new lead
          const { data: newLead, error: createError } = await supabase
            .from("leads")
            .insert([{
              workspace_id: currentWorkspace?.id,
              email: recipientEmail.trim(),
              name: recipientName.trim() || recipientEmail.split("@")[0],
              source: "email" as const,
              status: "new" as const,
              created_by: user?.id,
            }])
            .select("id")
            .single();

          if (createError) throw createError;
          entityId = newLead.id;
          entityType = 'lead';
        }
      }

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: {
          connectionId: activeConnection.id,
          to: recipientEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          isHtml: false,
        },
      });

      if (error) throw error;

      toast.success("Email enviado com sucesso!");
      onOpenChange(false);
      setRecipientEmail("");
      setRecipientName("");
      setSubject("");
      setBody("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Erro ao enviar email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Email do destinatário *</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="exemplo@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Nome (opcional)</Label>
              <Input
                id="recipient-name"
                placeholder="Nome do contacto"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
          </div>

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !recipientEmail.trim() || !subject.trim() || !body.trim() || !activeConnection}
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

export function ComposeButton({ className, variant = "default" }: ComposeButtonProps) {
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [showGHLDialog, setShowGHLDialog] = useState(false);
  const [showInstagramDialog, setShowInstagramDialog] = useState(false);
  const [selectedGHLChannel, setSelectedGHLChannel] = useState<GHLChannel>("whatsapp");

  // Check connection status
  const { data: emailConnections } = useEmailConnections();
  const { isConfigured: isGHLConfigured } = useWorkspaceGHLConfig();
  const { data: instagramConnection } = useInstagramConnection();

  const hasEmailConnection = emailConnections?.some(c => c.is_active);
  const hasInstagramConnection = instagramConnection?.is_active;

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
      configured: isGHLConfigured,
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
      configured: isGHLConfigured,
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
        setSelectedGHLChannel("whatsapp");
        setShowGHLDialog(true);
        break;
      case "sms":
        setSelectedGHLChannel("sms");
        setShowGHLDialog(true);
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
        <QuickInstagramDialog
          open={showInstagramDialog}
          onOpenChange={setShowInstagramDialog}
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
      <QuickInstagramDialog
        open={showInstagramDialog}
        onOpenChange={setShowInstagramDialog}
      />
    </>
  );
}
