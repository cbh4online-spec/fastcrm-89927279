import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMySellerProfile, useRegisterSeller } from "@/hooks/useC2CSellers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Store, ArrowLeft, CheckCircle2, Clock, XCircle, User, Phone, MapPin,
  CreditCard, Building2, FileText, Sparkles, ShieldCheck, DollarSign, Zap,
} from "lucide-react";

function useWorkspaceBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["c2c-ws-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export default function C2CSellerRegistration() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: workspace } = useWorkspaceBySlug(workspaceSlug);
  const workspaceId = workspace?.id;

  const { data: sellerProfile, isLoading: profileLoading } = useMySellerProfile(workspaceId);
  const registerSeller = useRegisterSeller(workspaceId);

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    phone: "",
    location: "",
    iban: "",
    bank_name: "",
    account_holder: "",
    nif: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim()) return;
    registerSeller.mutate(form);
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/c2c/${workspaceSlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Store className="h-5 w-5 text-primary" />
            <h1 className="font-bold">Tornar-se Vendedor</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <User className="h-16 w-16 mx-auto text-muted-foreground/30 mb-6" />
          <h2 className="text-xl font-semibold mb-2">Precisas de uma conta</h2>
          <p className="text-muted-foreground mb-6">
            Para te registares como vendedor, cria uma conta ou faz login.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(`/login?redirect=/c2c/${workspaceSlug}/sell`)}>Entrar</Button>
            <Button onClick={() => navigate(`/signup?redirect=/c2c/${workspaceSlug}/sell`)}>Criar Conta</Button>
          </div>
        </div>
      </div>
    );
  }

  // Already registered
  if (sellerProfile) {
    const statusConfig = {
      pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", label: "Em Análise", desc: "A tua candidatura está a ser analisada pela equipa." },
      approved: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Aprovado", desc: "Parabéns! Já podes publicar anúncios no marketplace." },
      rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Rejeitado", desc: sellerProfile.rejection_reason || "A tua candidatura não foi aprovada." },
      suspended: { icon: XCircle, color: "text-orange-600", bg: "bg-orange-50", label: "Suspenso", desc: "A tua conta de vendedor está suspensa." },
    };
    const s = statusConfig[sellerProfile.status];
    const StatusIcon = s.icon;

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/c2c/${workspaceSlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Store className="h-5 w-5 text-primary" />
            <h1 className="font-bold">Estado da Candidatura</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className={`mx-auto w-16 h-16 rounded-full ${s.bg} flex items-center justify-center`}>
                <StatusIcon className={`h-8 w-8 ${s.color}`} />
              </div>
              <Badge variant="outline" className={s.color}>{s.label}</Badge>
              <p className="text-muted-foreground">{s.desc}</p>
              {sellerProfile.status === "approved" && (
                <Button className="mt-4" onClick={() => navigate(`/c2c/${workspaceSlug}`)}>
                  Ir para o Marketplace
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/c2c/${workspaceSlug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Store className="h-5 w-5 text-primary" />
          <h1 className="font-bold">Tornar-se Vendedor</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        {/* Benefits */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: "Publicação rápida" },
              { icon: DollarSign, label: "Apenas 5% comissão" },
              { icon: ShieldCheck, label: "Pagamento seguro" },
              { icon: Sparkles, label: "Destaque disponível" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informação Pessoal
              </CardTitle>
              <CardDescription>Como queres aparecer no marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome de vendedor *</Label>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={(e) => updateField("display_name", e.target.value)}
                  placeholder="O nome que os compradores vão ver"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Sobre ti</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Conta um pouco sobre ti e o que vendes..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+351..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Localização
                  </Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Lisboa, Porto..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Dados Bancários
              </CardTitle>
              <CardDescription>Para recebermos os pagamentos das tuas vendas (95%)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={form.iban}
                  onChange={(e) => updateField("iban", e.target.value)}
                  placeholder="PT50..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name" className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> Banco
                  </Label>
                  <Input
                    id="bank_name"
                    value={form.bank_name}
                    onChange={(e) => updateField("bank_name", e.target.value)}
                    placeholder="Ex: Millennium BCP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_holder">Titular da Conta</Label>
                  <Input
                    id="account_holder"
                    value={form.account_holder}
                    onChange={(e) => updateField("account_holder", e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fiscal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Dados Fiscais
              </CardTitle>
              <CardDescription>Opcional — necessário para faturação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="nif">NIF</Label>
                <Input
                  id="nif"
                  value={form.nif}
                  onChange={(e) => updateField("nif", e.target.value)}
                  placeholder="Número de contribuinte"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(`/c2c/${workspaceSlug}`)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={registerSeller.isPending || !form.display_name.trim()}>
              {registerSeller.isPending ? "A submeter..." : "Submeter Candidatura"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
