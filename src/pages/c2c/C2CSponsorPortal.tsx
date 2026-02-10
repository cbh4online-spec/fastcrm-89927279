import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyApplications, useSubmitSponsorApplication, useSponsorCheckout } from "@/hooks/useSponsorApplications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Zap, CheckCircle, Clock, XCircle, CreditCard } from "lucide-react";

const TIERS = {
  bronze: {
    icon: Award,
    price: "19,99€",
    color: "border-orange-400 bg-orange-50 dark:bg-orange-950/20",
    features: ["Logo no rodapé da loja", "Link para o seu website", "Relatório mensal de impressões"],
  },
  silver: {
    icon: Star,
    price: "49,99€",
    color: "border-gray-400 bg-gray-50 dark:bg-gray-900/20",
    features: ["Logo destacado com descrição", "Posição prioritária", "Relatório semanal de performance", "Badge Silver"],
  },
  gold: {
    icon: Zap,
    price: "99,99€",
    color: "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
    features: ["Logo grande no topo", "Banner dedicado", "Posição premium", "Relatório em tempo real", "Badge Gold", "Suporte prioritário"],
  },
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending: { label: "Em análise", icon: Clock, color: "text-yellow-600" },
  approved: { label: "Aprovada", icon: CheckCircle, color: "text-green-600" },
  rejected: { label: "Rejeitada", icon: XCircle, color: "text-red-600" },
  active: { label: "Ativa", icon: CheckCircle, color: "text-emerald-600" },
  expired: { label: "Expirada", icon: Clock, color: "text-muted-foreground" },
};

export default function C2CSponsorPortal() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: workspace } = useQuery({
    queryKey: ["sponsor-workspace", workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return null;
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, slug")
        .eq("slug", workspaceSlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceSlug,
  });
  const { data: myApps = [], isLoading } = useMyApplications(workspace?.id);
  const submitApp = useSubmitSponsorApplication(workspace?.id);
  const checkout = useSponsorCheckout();

  const [selectedTier, setSelectedTier] = useState<"bronze" | "silver" | "gold">("bronze");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_email: user?.email || "",
    contact_phone: "",
    website_url: "",
    description: "",
  });

  const paymentStatus = searchParams.get("status");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitApp.mutate(
      { ...form, tier: selectedTier },
      { onSuccess: () => setShowForm(false) }
    );
  };

  const handleCheckout = (appId: string, tier: string) => {
    if (!workspace) return;
    checkout.mutate({ workspaceId: workspace.id, applicationId: appId, tier });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Torne-se Parceiro</CardTitle>
            <CardDescription>Faça login para submeter a sua candidatura de parceiro.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Programa de Parceiros</h1>
          <p className="text-muted-foreground">
            Promova a sua marca no nosso marketplace. Escolha o plano ideal para si.
          </p>
        </div>

        {paymentStatus === "success" && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 text-green-800 dark:text-green-200 text-center">
            ✅ Pagamento processado com sucesso! A sua parceria será ativada em breve.
          </div>
        )}

        {/* Tier Selection */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {(Object.entries(TIERS) as [keyof typeof TIERS, typeof TIERS[keyof typeof TIERS]][]).map(([key, tier]) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === key;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-lg ${tier.color} ${
                  isSelected ? "ring-2 ring-primary scale-[1.02]" : ""
                }`}
                onClick={() => setSelectedTier(key)}
              >
                <CardHeader className="text-center pb-2">
                  <Icon className="h-10 w-10 mx-auto mb-2" />
                  <CardTitle className="capitalize">{key}</CardTitle>
                  <p className="text-2xl font-bold">{tier.price}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Submit Application */}
        {!showForm ? (
          <div className="text-center mb-10">
            <Button size="lg" onClick={() => setShowForm(true)}>
              Candidatar-se como Parceiro {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}
            </Button>
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto mb-10">
            <CardHeader>
              <CardTitle>Candidatura — Parceiro {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}</CardTitle>
              <CardDescription>Preencha os dados da sua empresa. Analisaremos a candidatura em 24-48h.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Empresa *</Label>
                    <Input
                      required
                      value={form.company_name}
                      onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                      placeholder="Acme, Lda."
                    />
                  </div>
                  <div>
                    <Label>Email de Contacto *</Label>
                    <Input
                      required
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={form.contact_phone}
                      onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={form.website_url}
                      onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                      placeholder="https://acme.pt"
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrição da Empresa</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Breve descrição da sua empresa e porquê quer ser parceiro..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitApp.isPending}>
                    {submitApp.isPending ? "A submeter..." : "Submeter Candidatura"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* My Applications */}
        {myApps.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">As Minhas Candidaturas</h2>
            <div className="space-y-4">
              {myApps.map((app) => {
                const statusInfo = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusInfo.icon;
                return (
                  <Card key={app.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{app.company_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Tier: <Badge variant="outline" className="capitalize">{app.tier}</Badge>
                              {" · "}
                              {new Date(app.created_at).toLocaleDateString("pt-PT")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1.5 text-sm font-medium ${statusInfo.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            {statusInfo.label}
                          </span>
                          {app.status === "approved" && !app.stripe_payment_id && (
                            <Button
                              size="sm"
                              onClick={() => handleCheckout(app.id, app.tier)}
                              disabled={checkout.isPending}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                        </div>
                      </div>
                      {app.status === "rejected" && app.rejection_reason && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          Motivo: {app.rejection_reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
