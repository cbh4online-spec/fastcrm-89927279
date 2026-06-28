import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { useUpdateFastMatchProfile, type FastMatchProfile } from "@/hooks/useFastMatchProfile";
import { toast } from "sonner";

const INDUSTRIES = [
  "Tecnologia", "Marketing", "Consultoria", "E-commerce", "Saúde",
  "Educação", "Imobiliário", "Finanças", "Jurídico", "Construção",
  "Alimentação", "Turismo", "Indústria", "Energia", "Outro",
];

const TICKET_RANGES = [
  "< €500", "€500 - €2.000", "€2.000 - €5.000", "€5.000 - €15.000",
  "€15.000 - €50.000", "> €50.000",
];

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: FastMatchProfile;
}

export function ProfileEditDialog({ open, onOpenChange, profile }: ProfileEditDialogProps) {
  const updateProfile = useUpdateFastMatchProfile();
  const [newOffered, setNewOffered] = useState("");
  const [newNeeded, setNewNeeded] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    industry: "",
    target_audience: "",
    ticket_range: "",
    website_url: "",
    linkedin_url: "",
    services_offered: [] as string[],
    services_needed: [] as string[],
    bio: "",
  });

  useEffect(() => {
    if (open && profile) {
      setForm({
        company_name: profile.company_name || "",
        industry: profile.industry || "",
        target_audience: profile.target_audience || "",
        ticket_range: profile.ticket_range || "",
        website_url: profile.website_url || "",
        linkedin_url: profile.linkedin_url || "",
        services_offered: profile.services_offered || [],
        services_needed: profile.services_needed || [],
        bio: profile.bio || "",
      });
    }
  }, [open, profile]);

  const updateField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const addService = (type: "services_offered" | "services_needed", value: string) => {
    const trimmed = value.trim();
    if (!trimmed || form[type].includes(trimmed)) return;
    updateField(type, [...form[type], trimmed]);
  };

  const removeService = (type: "services_offered" | "services_needed", index: number) => {
    updateField(type, form[type].filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(form);
      toast.success("Perfil atualizado!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar perfil.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-bold tracking-tight">Editar Perfil FastMatch</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Define como a tua empresa aparece nas descobertas FastMatch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Identificação */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Identificação</p>
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Indústria</Label>
                <Select value={form.industry} onValueChange={(v) => updateField("industry", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ticket Médio</Label>
                <Select value={form.ticket_range} onValueChange={(v) => updateField("ticket_range", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_RANGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <Input value={form.target_audience} onChange={(e) => updateField("target_audience", e.target.value)} />
            </div>
          </section>

          {/* Presença online */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Presença online</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/..." />
              </div>
            </div>
          </section>

          {/* Serviços */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Serviços</p>
            <div className="space-y-2">
              <Label>Serviços Oferecidos</Label>
              <div className="flex gap-2">
                <Input value={newOffered} onChange={(e) => setNewOffered(e.target.value)} placeholder="Adicionar serviço..."
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService("services_offered", newOffered); setNewOffered(""); }}} />
                <Button type="button" size="icon" variant="outline" onClick={() => { addService("services_offered", newOffered); setNewOffered(""); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.services_offered.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.services_offered.map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">{s}
                      <button onClick={() => removeService("services_offered", i)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Serviços Procurados</Label>
              <div className="flex gap-2">
                <Input value={newNeeded} onChange={(e) => setNewNeeded(e.target.value)} placeholder="Adicionar serviço..."
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService("services_needed", newNeeded); setNewNeeded(""); }}} />
                <Button type="button" size="icon" variant="outline" onClick={() => { addService("services_needed", newNeeded); setNewNeeded(""); }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.services_needed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.services_needed.map((s, i) => (
                    <Badge key={i} variant="outline" className="gap-1 pr-1">{s}
                      <button onClick={() => removeService("services_needed", i)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Bio */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Apresentação</p>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} rows={4} placeholder="Descreve em poucas linhas o que a tua empresa faz e procura..." />
            </div>
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateProfile.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
