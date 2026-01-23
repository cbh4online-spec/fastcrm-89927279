import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfiles, useCourses } from "@/hooks/useStudentJourney";
import { LIFECYCLE_STAGE_CONFIG, LifecycleStage, PreferredChannel } from "@/types/studentJourney";
import { useContacts } from "@/hooks/useContacts";
import { Loader2, Link2, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const resetForm = () => { setFullName(""); setEmail(""); setPhone(""); setStage("lead"); setPrimaryInterest(""); setSelectedContactId(""); setTab("new"); };

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
            <Select value={selectedContactId} onValueChange={setSelectedContactId}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.email && `(${c.email})`}</SelectItem>)}</SelectContent></Select>
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
