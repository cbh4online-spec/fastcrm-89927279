import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Shield, Building2, Mail, Phone, MapPin, FileText } from "lucide-react";
import { useCompanyLegalData, type CompanyLegalData } from "../hooks/useCompanyLegalData";
import { toast } from "sonner";

export default function GDPRBackofficePage() {
  const { companyData, isLoading, saveCompanyData } = useCompanyLegalData();
  const [form, setForm] = useState<CompanyLegalData>(companyData);

  useEffect(() => {
    if (companyData) setForm(companyData);
  }, [companyData]);

  const handleChange = (field: keyof CompanyLegalData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await saveCompanyData.mutateAsync(form);
      toast.success("Dados da empresa guardados com sucesso");
    } catch {
      toast.error("Erro ao guardar os dados");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RGPD — Backoffice</h1>
            <p className="text-muted-foreground text-sm">
              Gerir os dados legais da empresa exibidos nas páginas de Privacidade, Termos, RGPD e Cookies.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>
              Estes dados são utilizados automaticamente nas páginas legais públicas do site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome Legal</Label>
                <Input
                  id="company_name"
                  placeholder="Ex: FastCRM, Lda."
                  value={form.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nif">NIF</Label>
                <Input
                  id="nif"
                  placeholder="Ex: 123456789"
                  value={form.nif}
                  onChange={(e) => handleChange("nif", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_street" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Morada
              </Label>
              <Input
                id="address_street"
                placeholder="Rua / Avenida"
                value={form.address_street}
                onChange={(e) => handleChange("address_street", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Código Postal"
                  value={form.address_postal_code}
                  onChange={(e) => handleChange("address_postal_code", e.target.value)}
                />
                <Input
                  placeholder="Cidade"
                  value={form.address_city}
                  onChange={(e) => handleChange("address_city", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email_general" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Geral
                </Label>
                <Input
                  id="email_general"
                  type="email"
                  placeholder="geral@empresa.pt"
                  value={form.email_general}
                  onChange={(e) => handleChange("email_general", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_dpo" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email DPO
                </Label>
                <Input
                  id="email_dpo"
                  type="email"
                  placeholder="dpo@empresa.pt"
                  value={form.email_dpo}
                  onChange={(e) => handleChange("email_dpo", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 md:w-1/2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Telefone
              </Label>
              <Input
                id="phone"
                placeholder="+351 xxx xxx xxx"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button onClick={handleSave} disabled={saveCompanyData.isPending}>
                {saveCompanyData.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar
              </Button>
              <p className="text-xs text-muted-foreground">
                <FileText className="h-3 w-3 inline mr-1" />
                As alterações são refletidas imediatamente nas páginas públicas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
