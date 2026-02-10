import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useContacts } from "@/hooks/useContacts";
import { useInviteCommunityMember } from "@/hooks/useCommunityMembers";
import { Search, X, Loader2, UserPlus, Users, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteToCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ManualInvite {
  name: string;
  email: string;
}

interface SelectedContact {
  id: string;
  name: string;
  email: string;
}

export function InviteToCommunityDialog({ open, onOpenChange }: InviteToCommunityDialogProps) {
  const { contacts, isLoading: contactsLoading } = useContacts();
  const inviteMutation = useInviteCommunityMember();

  const [tab, setTab] = useState<string>("crm");
  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([]);
  const [manualInvite, setManualInvite] = useState<ManualInvite>({ name: "", email: "" });
  const [manualList, setManualList] = useState<ManualInvite[]>([]);

  const contactsWithEmail = useMemo(() => {
    return contacts.filter((c) => c.email);
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    if (!search) return contactsWithEmail;
    const lower = search.toLowerCase();
    return contactsWithEmail.filter(
      (c) => c.name.toLowerCase().includes(lower) || c.email?.toLowerCase().includes(lower)
    );
  }, [contactsWithEmail, search]);

  const toggleContact = (contact: { id: string; name: string; email: string | null }) => {
    if (!contact.email) return;
    setSelectedContacts((prev) => {
      const exists = prev.find((c) => c.id === contact.id);
      if (exists) return prev.filter((c) => c.id !== contact.id);
      return [...prev, { id: contact.id, name: contact.name, email: contact.email! }];
    });
  };

  const addManual = () => {
    if (!manualInvite.name || !manualInvite.email) return;
    setManualList((prev) => [...prev, { ...manualInvite }]);
    setManualInvite({ name: "", email: "" });
  };

  const removeManual = (index: number) => {
    setManualList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const invites = [
      ...selectedContacts.map((c) => ({ email: c.email, name: c.name, contactId: c.id })),
      ...manualList.map((m) => ({ email: m.email, name: m.name })),
    ];

    if (invites.length === 0) return;

    await inviteMutation.mutateAsync(invites);
    onOpenChange(false);
    setSelectedContacts([]);
    setManualList([]);
    setSearch("");
  };

  const totalInvites = selectedContacts.length + manualList.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Convidar para a Comunidade
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="crm" className="flex-1 gap-1.5">
              <Users className="h-3.5 w-3.5" /> Do CRM
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar contactos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedContacts.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                    {c.name}
                    <button onClick={() => toggleContact(c)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <ScrollArea className="h-[220px] border rounded-lg">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? "Nenhum contacto encontrado" : "Sem contactos com email"}
                </p>
              ) : (
                <div className="p-1">
                  {filteredContacts.map((c) => {
                    const isSelected = selectedContacts.some((s) => s.id === c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleContact(c)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted/50 transition-colors",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span className="text-primary-foreground text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  placeholder="Nome"
                  value={manualInvite.name}
                  onChange={(e) => setManualInvite((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  placeholder="email@exemplo.com"
                  type="email"
                  value={manualInvite.email}
                  onChange={(e) => setManualInvite((p) => ({ ...p, email: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addManual()}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={addManual} disabled={!manualInvite.name || !manualInvite.email} className="w-full">
              Adicionar à lista
            </Button>

            {manualList.length > 0 && (
              <div className="space-y-1.5 border rounded-lg p-2">
                {manualList.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-2 py-1.5 rounded bg-muted/30">
                    <div>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground ml-2">{m.email}</span>
                    </div>
                    <button onClick={() => removeManual(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={totalInvites === 0 || inviteMutation.isPending}
            className="gap-1.5"
          >
            {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar {totalInvites > 0 ? `(${totalInvites})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
