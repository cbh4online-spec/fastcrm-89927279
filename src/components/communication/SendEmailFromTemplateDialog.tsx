import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Mail, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/useContacts";
import { ComposeEmailDialog } from "@/components/email";
import { CommunicationTemplate } from "@/types/communicationTemplate";

interface SendEmailFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CommunicationTemplate | null;
}

export function SendEmailFromTemplateDialog({
  open,
  onOpenChange,
  template,
}: SendEmailFromTemplateDialogProps) {
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    name: string;
    email: string;
    type: 'contact' | 'lead';
  } | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [useManual, setUseManual] = useState(false);

  const { contacts, isLoading: contactsLoading } = useContacts();

  // Filter contacts with email
  const contactsWithEmail = useMemo(() => 
    contacts.filter(c => c.email),
    [contacts]
  );

  const handleSelectRecipient = (contact: typeof contactsWithEmail[0]) => {
    setSelectedRecipient({
      id: contact.id,
      name: contact.name,
      email: contact.email!,
      type: 'contact',
    });
    setUseManual(false);
    setRecipientOpen(false);
  };

  const handleProceed = () => {
    if (useManual && manualEmail) {
      setSelectedRecipient({
        id: "new",
        name: manualName || manualEmail.split("@")[0],
        email: manualEmail,
        type: 'contact',
      });
    }
    if (selectedRecipient || (useManual && manualEmail)) {
      setShowComposer(true);
    }
  };

  const handleClose = () => {
    setSelectedRecipient(null);
    setManualEmail("");
    setManualName("");
    setUseManual(false);
    setShowComposer(false);
    onOpenChange(false);
  };

  // If showing composer, render ComposeEmailDialog
  if (showComposer && (selectedRecipient || (useManual && manualEmail))) {
    const recipientData = selectedRecipient || {
      id: "new",
      name: manualName || manualEmail.split("@")[0],
      email: manualEmail,
      type: 'contact' as const,
    };

    return (
      <ComposeEmailDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        recipient={{
          email: recipientData.email,
          name: recipientData.name,
          entityType: recipientData.type,
          entityId: recipientData.id,
        }}
        defaultSubject={template?.subject || ""}
        defaultBody={template?.body || ""}
        autoCreateContact={recipientData.id === "new"}
        onSent={handleClose}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <DialogTitle>Enviar Email</DialogTitle>
          </div>
          <DialogDescription>
            {template 
              ? `Enviar template "${template.name}" por email`
              : "Selecione um destinatário para enviar email"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipient Selector */}
          <div className="space-y-2">
            <Label>Destinatário</Label>
            <Popover open={recipientOpen} onOpenChange={setRecipientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={recipientOpen}
                  className="w-full justify-between"
                  disabled={useManual}
                >
                  {selectedRecipient ? (
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {selectedRecipient.name}
                      <span className="text-muted-foreground text-xs">
                        ({selectedRecipient.email})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Selecionar contacto...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar contacto..." />
                  <CommandList>
                    <CommandEmpty>
                      {contactsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        "Nenhum contacto encontrado"
                      )}
                    </CommandEmpty>
                    <CommandGroup heading="Contactos">
                      {contactsWithEmail.slice(0, 20).map((contact) => (
                        <CommandItem
                          key={contact.id}
                          onSelect={() => handleSelectRecipient(contact)}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedRecipient?.id === contact.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{contact.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {contact.email}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Manual Email Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-manual"
                checked={useManual}
                onChange={(e) => {
                  setUseManual(e.target.checked);
                  if (e.target.checked) {
                    setSelectedRecipient(null);
                  }
                }}
                className="rounded border-input"
              />
              <Label htmlFor="use-manual" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Novo destinatário (criar contacto)
              </Label>
            </div>
            
            {useManual && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1.5">
                  <Label htmlFor="manual-email" className="text-xs">Email *</Label>
                  <Input
                    id="manual-email"
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-name" className="text-xs">Nome</Label>
                  <Input
                    id="manual-name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Nome do contacto"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Um novo contacto será criado automaticamente ao enviar o email.
                </p>
              </div>
            )}
          </div>

          {/* Template preview */}
          {template && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">Template</Badge>
                <span className="font-medium text-sm">{template.name}</span>
              </div>
              {template.subject && (
                <p className="text-xs text-muted-foreground mb-1">
                  <strong>Assunto:</strong> {template.subject}
                </p>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.body.substring(0, 150)}...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!selectedRecipient && (!useManual || !manualEmail)}
          >
            <Mail className="w-4 h-4 mr-2" />
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
