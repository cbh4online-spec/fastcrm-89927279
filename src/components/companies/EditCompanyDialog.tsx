import { useState, useEffect } from "react";
import { useCompanies, Company } from "@/hooks/useCompanies";
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
import { SocialMediaFields } from "@/components/shared/SocialMediaFields";

interface EditCompanyDialogProps {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const companySizes = [
  { value: "1-10", label: "1-10 funcionários" },
  { value: "11-50", label: "11-50 funcionários" },
  { value: "51-200", label: "51-200 funcionários" },
  { value: "201-500", label: "201-500 funcionários" },
  { value: "501-1000", label: "501-1000 funcionários" },
  { value: "1000+", label: "1000+ funcionários" },
];

const industries = [
  "Tecnologia",
  "Saúde",
  "Finanças",
  "Educação",
  "Retalho",
  "Manufatura",
  "Construção",
  "Consultoria",
  "Marketing",
  "Imobiliário",
  "Hotelaria",
  "Outro",
];

export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
  const { updateCompany } = useCompanies();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    industry: "",
    size: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    tags: "",
    linkedin_url: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        website: company.website || "",
        industry: company.industry || "",
        size: company.size || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
        notes: company.notes || "",
        tags: company.tags?.join(", ") || "",
        linkedin_url: company.linkedin_url || "",
        facebook_url: company.facebook_url || "",
        instagram_url: company.instagram_url || "",
        twitter_url: company.twitter_url || "",
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        name: formData.name.trim(),
        website: formData.website.trim() || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        linkedin_url: formData.linkedin_url.trim() || undefined,
        facebook_url: formData.facebook_url.trim() || undefined,
        instagram_url: formData.instagram_url.trim() || undefined,
        twitter_url: formData.twitter_url.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Editar Empresa</DialogTitle>
          <DialogDescription>
            Atualize as informações da empresa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-name">Nome da Empresa *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-industry">Indústria</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData({ ...formData, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar indústria" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-size">Tamanho</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tamanho" />
                </SelectTrigger>
                <SelectContent>
                  {companySizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="www.empresa.pt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="geral@empresa.pt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+351 21 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="parceiro, premium, ativo"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-address">Morada</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, Cidade, País"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre a empresa..."
                rows={3}
              />
            </div>
            
            {/* Social Media Fields */}
            <div className="sm:col-span-2 pt-2 border-t">
              <SocialMediaFields
                linkedinUrl={formData.linkedin_url}
                facebookUrl={formData.facebook_url}
                instagramUrl={formData.instagram_url}
                twitterUrl={formData.twitter_url}
                onChange={handleSocialChange}
              />
            </div>
            
            {/* Custom Fields */}
            <div className="sm:col-span-2 pt-2 border-t">
              <CustomFieldsForm entityType="company" entityId={company.id} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "A guardar..." : "Guardar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
