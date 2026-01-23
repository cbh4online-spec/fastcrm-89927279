import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfiles } from "@/hooks/useStudentJourney";
import { useContacts } from "@/hooks/useContacts";
import { LIFECYCLE_STAGE_CONFIG, LifecycleStage } from "@/types/studentJourney";
import { Loader2, Link2, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStudentDialog({
  open,
  onOpenChange,
}: CreateStudentDialogProps) {
  const { createProfile } = useProfiles();
  const { contacts } = useContacts();
  const [tab, setTab] = useState<"new" | "link">("new");

  // New student form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<LifecycleStage>("lead");
  const [interests, setInterests] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  // Link to contact
  const [selectedContactId, setSelectedContactId] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setStage("lead");
    setInterests("");
    setSource("");
    setNotes("");
    setSelectedContactId("");
    setTab("new");
  };

  const handleSubmit = async () => {
    if (tab === "new") {
      if (!name.trim()) return;

      await createProfile.mutateAsync({
        full_name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        lifecycle_stage: stage,
        interests: interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        primary_interest: source.trim() || undefined,
      });
    } else {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (!contact) return;

      await createProfile.mutateAsync({
        full_name: contact.name,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        contact_id: contact.id,
        lifecycle_stage: "lead",
      });
    }

    resetForm();
    onOpenChange(false);
  };

  const stages = Object.entries(LIFECYCLE_STAGE_CONFIG).filter(
    ([key]) => key !== "churned"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Aluno</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "link")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Aluno
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Ligar a Contacto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do aluno"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stage">Etapa</Label>
                  <Select value={stage} onValueChange={(v) => setStage(v as LifecycleStage)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="source">Interesse Principal</Label>
                  <Input
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Ex: Marketing, Design..."
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="interests">Interesses (separados por vírgula)</Label>
                <Input
                  id="interests"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Ex: Marketing, Design, Vendas"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionais..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Selecione um contacto existente do CRM para criar um aluno ligado.
              Os dados do contacto serão sincronizados automaticamente.
            </p>

            <div className="grid gap-2">
              <Label>Contacto do CRM</Label>
              <Select
                value={selectedContactId}
                onValueChange={setSelectedContactId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contacto..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.email && (
                        <span className="text-muted-foreground ml-2">
                          ({contact.email})
                        </span>
                      )}
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
          <Button
            onClick={handleSubmit}
            disabled={
              createProfile.isPending ||
              (tab === "new" ? !name.trim() : !selectedContactId)
            }
          >
            {createProfile.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Criar Aluno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
