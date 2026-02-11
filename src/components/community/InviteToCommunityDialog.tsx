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
import { useCommunitySettings } from "@/hooks/useCommunitySettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Search, X, Loader2, UserPlus, Users, Mail, Share2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { currentWorkspace } = useWorkspace();
  const { data: communitySettings } = useCommunitySettings(currentWorkspace?.id);

  const [tab, setTab] = useState<string>("crm");
  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([]);
  const [manualInvite, setManualInvite] = useState<ManualInvite>({ name: "", email: "" });
  const [manualList, setManualList] = useState<ManualInvite[]>([]);
  const [copied, setCopied] = useState(false);

  const publicUrl = communitySettings?.slug
    ? `${getPublicBaseUrl()}/club/${communitySettings.slug}`
    : "";
  const communityName = communitySettings?.name || "a comunidade";

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
            <TabsTrigger value="link" className="flex-1 gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Link
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

          <TabsContent value="link" className="space-y-4 mt-3">
            {publicUrl ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Partilhe este link para que qualquer pessoa possa pedir adesão à comunidade.
                </p>
                <div className="flex gap-2">
                  <Input value={publicUrl} readOnly className="text-sm" onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(publicUrl);
                        setCopied(true);
                        toast.success("Link copiado!");
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        toast.error("Não foi possível copiar o link");
                      }
                    }}
                  >
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Partilhar via:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const text = `Junta-te a ${communityName}!\n${publicUrl}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`, "_blank", "width=600,height=400");
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Configure um slug para a comunidade nas definições para gerar o link público.
              </p>
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
