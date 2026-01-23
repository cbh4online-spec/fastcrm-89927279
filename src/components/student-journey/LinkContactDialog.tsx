import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSJCrmIntegration } from "@/hooks/useSJCrmIntegration";
import { useContacts } from "@/hooks/useContacts";
import { SJProfile } from "@/types/studentJourney";
import { Loader2, UserPlus, Link2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  // Create new contact form
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [tags, setTags] = useState("student-journey");

  // Link to existing contact
  const [selectedContactId, setSelectedContactId] = useState("");

  const resetForm = () => {
    setCompany("");
    setJobTitle("");
    setTags("student-journey");
    setSelectedContactId("");
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

  // Filter contacts that could match this profile
  const suggestedContacts = contacts.filter((c) => {
    if (profile.email && c.email?.toLowerCase() === profile.email.toLowerCase()) return true;
    if (profile.phone && c.phone === profile.phone) return true;
    if (c.name.toLowerCase() === profile.full_name.toLowerCase()) return true;
    return false;
  });

  const otherContacts = contacts.filter((c) => !suggestedContacts.includes(c));

  const isPending = convertToContact.isPending || linkToContact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {suggestedContacts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Contactos Sugeridos (dados coincidentes)
                </p>
                <div className="space-y-2">
                  {suggestedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedContactId === contact.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedContactId(contact.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contact.email || contact.phone || "Sem contacto"}
                          </p>
                        </div>
                        <Badge variant="secondary">Sugerido</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Selecionar Contacto</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um contacto..." />
                </SelectTrigger>
                <SelectContent>
                  {suggestedContacts.length > 0 && (
                    <>
                      {suggestedContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          ⭐ {contact.name} {contact.email && `(${contact.email})`}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {otherContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.email && `(${contact.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
