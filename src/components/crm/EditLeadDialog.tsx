import { useEffect, useState } from "react";
import { useUpdateLead, type Lead, type LeadStatus } from "@/hooks/useLeads";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { CustomFieldsForm } from "@/components/custom-fields/CustomFieldsForm";
import { OptionalFieldsSection } from "@/components/crm/shared/OptionalFieldsSection";
import { isValidPhone } from "@/utils/phone";
import { Building2, MapPin } from "lucide-react";
import { toast } from "sonner";

export type EditableLead = Partial<Lead> & { id: string; name: string };

interface EditLeadDialogProps {
  lead: EditableLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company_name: "",
  website: "",
  industry: "",
  tax_id: "",
  source: "",
  status: "new" as LeadStatus,
  tags: "",
  notes: "",
  address: "",
  address_number: "",
  address_floor: "",
  postal_code: "",
  city: "",
  region: "",
  country: "",
};

export function EditLeadDialog({ lead, open, onOpenChange }: EditLeadDialogProps) {
  const updateLead = useUpdateLead();
  const [optionalsOpen, setOptionalsOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company_name: lead.company_name || "",
        website: lead.website || "",
        industry: lead.industry || "",
        tax_id: lead.tax_id || "",
        source: lead.source || "",
        status: (lead.status as LeadStatus) || "new",
        tags: lead.tags?.join(", ") || "",
        notes: lead.notes || "",
        address: lead.address || "",
        address_number: lead.address_number || "",
        address_floor: lead.address_floor || "",
        postal_code: lead.postal_code || "",
        city: lead.city || "",
        region: lead.region || "",
        country: lead.country || "",
      });
      setOptionalsOpen(false);
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !formData.name.trim()) return;

    if (formData.phone.trim() && !isValidPhone(formData.phone.trim(), "PT")) {
      toast.error("Número de telefone inválido");
      return;
    }

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        company_name: formData.company_name.trim() || undefined,
        website: formData.website.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        source: formData.source.trim() || undefined,
        status: formData.status,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: formData.notes.trim() || undefined,
        address: formData.address.trim() || undefined,
        address_number: formData.address_number.trim() || undefined,
        address_floor: formData.address_floor.trim() || undefined,
        postal_code: formData.postal_code.trim() || undefined,
        city: formData.city.trim() || undefined,
        region: formData.region.trim() || undefined,
        country: formData.country.trim() || undefined,
      });
      toast.success("Lead atualizado");
      onOpenChange(false);
    } catch {
      // erro já tratado no hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
          <DialogDescription>Atualize as informações do lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-lead-name">Nome</Label>
              <Input
                id="edit-lead-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João Silva"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-lead-email">Email</Label>
                <Input
                  id="edit-lead-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@empresa.pt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-phone">Telefone</Label>
                <Input
                  id="edit-lead-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>
          </div>

          <OptionalFieldsSection open={optionalsOpen} onOpenChange={setOptionalsOpen}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-lead-company" className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Empresa
                </Label>
                <Input
                  id="edit-lead-company"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Empresa XYZ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-website">Website</Label>
                <Input
                  id="edit-lead-website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://exemplo.pt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-taxid">NIF</Label>
                <Input
                  id="edit-lead-taxid"
                  maxLength={9}
                  value={formData.tax_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_id: e.target.value.replace(/\D/g, "").slice(0, 9) })
                  }
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-industry">Setor / CAE</Label>
                <Input
                  id="edit-lead-industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Tecnologia, Saúde..."
                />
              </div>
            </div>

            {/* Morada */}
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <Label className="flex items-center gap-1 text-sm font-medium">
                <MapPin className="w-3.5 h-3.5" />
                Morada
              </Label>
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="space-y-2 sm:col-span-4">
                  <Label htmlFor="edit-lead-address">Endereço</Label>
                  <Input
                    id="edit-lead-address"
                    maxLength={300}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, avenida, lugar..."
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="edit-lead-address-number">Número</Label>
                  <Input
                    id="edit-lead-address-number"
                    maxLength={100}
                    value={formData.address_number}
                    onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                    placeholder="12"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="edit-lead-address-floor">Andar</Label>
                  <Input
                    id="edit-lead-address-floor"
                    maxLength={100}
                    value={formData.address_floor}
                    onChange={(e) => setFormData({ ...formData, address_floor: e.target.value })}
                    placeholder="3.º Esq."
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-lead-postal">Código Postal</Label>
                  <Input
                    id="edit-lead-postal"
                    maxLength={20}
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="1000-001"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-lead-city">Cidade</Label>
                  <Input
                    id="edit-lead-city"
                    maxLength={100}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Lisboa"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="edit-lead-region">Região</Label>
                  <Input
                    id="edit-lead-region"
                    maxLength={100}
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="Lisboa"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="edit-lead-country">País</Label>
                  <Input
                    id="edit-lead-country"
                    maxLength={100}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Portugal"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-lead-source">Origem</Label>
                <Input
                  id="edit-lead-source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Website, Referência..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}
                >
                  <SelectTrigger id="edit-lead-status">
                    <SelectValue placeholder="Selecionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lead-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="edit-lead-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="cliente, vip, parceiro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lead-notes">Notas</Label>
              <Textarea
                id="edit-lead-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre o lead..."
                rows={3}
              />
            </div>

            {lead && (
              <div className="pt-2 border-t">
                <CustomFieldsForm entityType="lead" entityId={lead.id} />
              </div>
            )}
          </OptionalFieldsSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateLead.isPending || !formData.name.trim()}>
              {updateLead.isPending ? "A guardar..." : "Guardar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
