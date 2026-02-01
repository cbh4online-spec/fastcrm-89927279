import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useSJCrmIntegration } from "@/hooks/useSJCrmIntegration";
import { useContacts } from "@/hooks/useContacts";
import { SJProfile } from "@/types/studentJourney";
import { Loader2, UserPlus, Link2, Users, ChevronsUpDown, Check, CheckCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SJProfile;
}

export function LinkContactDialog({
  open,
  onOpenChange,
  profile,
}: LinkContactDialogProps) {
  const { convertToContact, linkToContact } = useSJCrmIntegration();
  const { contacts } = useContacts();
  const [tab, setTab] = useState<"create" | "link">("create");
  const [searchOpen, setSearchOpen] = useState(false);

  // Create new contact form
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [tags, setTags] = useState("student-journey");

  // Link to existing contact
  const [selectedContactId, setSelectedContactId] = useState("");
  const [autoMatched, setAutoMatched] = useState(false);

  // Filter contacts that could match this profile
  const suggestedContacts = contacts.filter((c) => {
    if (profile.email && c.email?.toLowerCase() === profile.email.toLowerCase()) return true;
    if (profile.phone && c.phone === profile.phone) return true;
    if (c.name.toLowerCase() === profile.full_name.toLowerCase()) return true;
    return false;
  });

  const otherContacts = contacts.filter((c) => !suggestedContacts.includes(c));
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // Auto-match when dialog opens
  useEffect(() => {
    if (open && !selectedContactId && contacts.length > 0) {
      // Try exact email match first
      const emailMatch = contacts.find(
        (c) => profile.email && c.email?.toLowerCase() === profile.email.toLowerCase()
      );
      if (emailMatch) {
        setSelectedContactId(emailMatch.id);
        setTab("link");
        setAutoMatched(true);
        return;
      }

      // Try exact name match
      const nameMatch = contacts.find(
        (c) => c.name.toLowerCase() === profile.full_name.toLowerCase()
      );
      if (nameMatch) {
        setSelectedContactId(nameMatch.id);
        setTab("link");
        setAutoMatched(true);
      }
    }
  }, [open, contacts, profile.email, profile.full_name, selectedContactId]);

  const resetForm = () => {
    setCompany("");
    setJobTitle("");
    setTags("student-journey");
    setSelectedContactId("");
    setAutoMatched(false);
    setTab("create");
  };

  const handleCreateAndLink = async () => {
    await convertToContact.mutateAsync({
      profile,
      additionalData: {
        company: company.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      },
    });
    resetForm();
    onOpenChange(false);
  };

  const handleLinkExisting = async () => {
    if (!selectedContactId) return;
    await linkToContact.mutateAsync({
      profileId: profile.id,
      contactId: selectedContactId,
    });
    resetForm();
    onOpenChange(false);
  };

  const isPending = convertToContact.isPending || linkToContact.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ligar ao CRM
          </DialogTitle>
          <DialogDescription>
            Crie um novo contacto ou ligue a um existente no CRM.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "link")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Criar Contacto
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Ligar Existente
              {suggestedContacts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {suggestedContacts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">Dados do Perfil</p>
              <p className="text-sm text-muted-foreground">
                Nome: <span className="text-foreground">{profile.full_name}</span>
              </p>
              {profile.email && (
                <p className="text-sm text-muted-foreground">
                  Email: <span className="text-foreground">{profile.email}</span>
                </p>
              )}
              {profile.phone && (
                <p className="text-sm text-muted-foreground">
                  Telefone: <span className="text-foreground">{profile.phone}</span>
                </p>
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Empresa (opcional)</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Função (opcional)</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex: Estudante, Profissional..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Etiquetas</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Separadas por vírgula"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            {/* Auto-match feedback */}
            {autoMatched && selectedContactId && suggestedContacts.some((c) => c.id === selectedContactId) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Contacto encontrado automaticamente por correspondência de dados</span>
              </div>
            )}

            {/* Searchable contact selector */}
            <div className="grid gap-2">
              <Label>Selecionar Contacto</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full justify-between h-auto min-h-10 py-2"
                  >
                    {selectedContact ? (
                      <span className="flex items-center gap-2 text-left">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{selectedContact.name}</span>
                          {selectedContact.email && (
                            <span className="block text-xs text-muted-foreground truncate">
                              {selectedContact.email}
                            </span>
                          )}
                        </span>
                        {suggestedContacts.some((c) => c.id === selectedContact.id) && (
                          <Badge variant="secondary" className="shrink-0">Match</Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pesquisar contacto...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar por nome, email ou telefone..." />
                    <CommandList>
                      <CommandEmpty>Nenhum contacto encontrado</CommandEmpty>

                      {/* Suggested contacts group */}
                      {suggestedContacts.length > 0 && (
                        <CommandGroup heading="Correspondências Encontradas">
                          {suggestedContacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={`${contact.name} ${contact.email || ""} ${contact.phone || ""}`}
                              onSelect={() => {
                                setSelectedContactId(contact.id);
                                setSearchOpen(false);
                                setAutoMatched(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 mr-2 shrink-0",
                                  selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{contact.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {contact.email || contact.phone || "Sem contacto"}
                                </div>
                              </div>
                              <Badge variant="secondary" className="ml-2 shrink-0">Match</Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* All other contacts */}
                      {otherContacts.length > 0 && (
                        <CommandGroup heading="Todos os Contactos">
                          {otherContacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={`${contact.name} ${contact.email || ""} ${contact.phone || ""}`}
                              onSelect={() => {
                                setSelectedContactId(contact.id);
                                setSearchOpen(false);
                                setAutoMatched(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 mr-2 shrink-0",
                                  selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{contact.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {contact.email || contact.phone || "—"}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Profile data reference */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Dados do Perfil a Ligar</p>
              <p className="text-sm">{profile.full_name}</p>
              {(profile.email || profile.phone) && (
                <p className="text-xs text-muted-foreground">
                  {[profile.email, profile.phone].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {tab === "create" ? (
            <Button onClick={handleCreateAndLink} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar e Ligar
            </Button>
          ) : (
            <Button onClick={handleLinkExisting} disabled={isPending || !selectedContactId}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ligar ao Contacto
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
