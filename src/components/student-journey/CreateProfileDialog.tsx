import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfiles, useCourses } from "@/hooks/useStudentJourney";
import { LIFECYCLE_STAGE_CONFIG, LifecycleStage, PreferredChannel } from "@/types/studentJourney";
import { useContacts } from "@/hooks/useContacts";
import { Loader2, Link2, UserPlus, Check, ChevronsUpDown, Search, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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

interface CreateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProfileDialog({ open, onOpenChange }: CreateProfileDialogProps) {
  const { createProfile } = useProfiles();
  const { contacts } = useContacts();
  const [tab, setTab] = useState<"new" | "link">("new");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<LifecycleStage>("lead");
  const [primaryInterest, setPrimaryInterest] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const searchLower = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(searchLower)
    );
  }, [contacts, contactSearch]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setStage("lead");
    setPrimaryInterest("");
    setSelectedContactId("");
    setContactSearch("");
    setContactPopoverOpen(false);
    setTab("new");
  };

  const handleSubmit = async () => {
    if (tab === "new") {
      if (!fullName.trim()) return;
      await createProfile.mutateAsync({ full_name: fullName.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, lifecycle_stage: stage, primary_interest: primaryInterest.trim() || undefined });
    } else {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (!contact) return;
      await createProfile.mutateAsync({ full_name: contact.name, email: contact.email || undefined, phone: contact.phone || undefined, contact_id: contact.id, lifecycle_stage: "lead" });
    }
    resetForm();
    onOpenChange(false);
  };

  const stages = Object.entries(LIFECYCLE_STAGE_CONFIG).filter(([key]) => key !== "churned");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Adicionar Perfil</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "link")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="new" className="gap-2"><UserPlus className="h-4 w-4" />Novo</TabsTrigger>
            <TabsTrigger value="link" className="gap-2"><Link2 className="h-4 w-4" />Ligar Contacto</TabsTrigger>
          </TabsList>
          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Etapa</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as LifecycleStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map(([key, config]) => <SelectItem key={key} value={key}>{config.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid gap-2"><Label>Interesse Principal</Label><Input value={primaryInterest} onChange={(e) => setPrimaryInterest(e.target.value)} placeholder="Ex: Marketing" /></div>
            </div>
          </TabsContent>
          <TabsContent value="link" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Selecione um contacto existente do CRM.</p>
            <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={contactPopoverOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {selectedContact ? (
                      <span className="truncate">{selectedContact.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Pesquisar contacto...</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Pesquisar por nome, email ou telefone..."
                    value={contactSearch}
                    onValueChange={setContactSearch}
                  />
                  <CommandList>
                    {filteredContacts.length === 0 ? (
                      <CommandEmpty>
                        <div className="text-center py-4">
                          <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Nenhum contacto encontrado
                          </p>
                        </div>
                      </CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {filteredContacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.id}
                            onSelect={() => {
                              setSelectedContactId(contact.id);
                              setContactPopoverOpen(false);
                              setContactSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4 mr-2",
                                selectedContactId === contact.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{contact.name}</div>
                              {contact.email && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {contact.email}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createProfile.isPending || (tab === "new" ? !fullName.trim() : !selectedContactId)}>
            {createProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
