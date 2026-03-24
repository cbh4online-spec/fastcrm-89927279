import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccountBriefOnboarding, OnboardingProfile, OnboardingICP, OnboardingAccount } from "@/hooks/useAccountBriefOnboarding";
import { Briefcase, Building2, Target, Plus, Trash2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "A sua empresa", icon: Building2 },
  { id: 2, title: "ICP ideal", icon: Target },
  { id: 3, title: "Primeiras contas", icon: Briefcase },
];

export default function AccountBriefOnboardingPage() {
  const navigate = useNavigate();
  const { completeOnboarding } = useAccountBriefOnboarding();
  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState<OnboardingProfile>({
    company_name: "",
    team_type: "",
    selling_sector: "",
  });

  const [icp, setIcp] = useState<OnboardingICP>({
    company_type: "",
    industry: "",
    geography: "",
    size_band: "",
    notes: "",
  });

  const [accounts, setAccounts] = useState<OnboardingAccount[]>([
    { name: "", domain: "" },
  ]);

  const addAccount = () => setAccounts([...accounts, { name: "", domain: "" }]);
  const removeAccount = (i: number) => setAccounts(accounts.filter((_, idx) => idx !== i));

  const handleFinish = async () => {
    await completeOnboarding.mutateAsync({ profile, icp, accounts: accounts.filter(a => a.domain) });
    navigate("/dashboard/account-brief");
  };

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-8 space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  step >= s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                </div>
                {s.id < 3 && <div className={cn("w-12 h-0.5", step > s.id ? "bg-primary" : "bg-muted")} />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                  A sua empresa
                </CardTitle>
                <CardDescription>Informações básicas sobre a sua empresa e equipa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da empresa</Label>
                  <Input value={profile.company_name} onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} placeholder="Ex: FastCRM" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de equipa</Label>
                  <Select value={profile.team_type} onValueChange={(v) => setProfile({ ...profile, team_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="founder-led">Founder-led Sales</SelectItem>
                      <SelectItem value="sdr-bdr">Equipa SDR/BDR</SelectItem>
                      <SelectItem value="agency">Agência Outbound</SelectItem>
                      <SelectItem value="consultancy">Consultoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Setor em que vende</Label>
                  <Input value={profile.selling_sector} onChange={(e) => setProfile({ ...profile, selling_sector: e.target.value })} placeholder="Ex: SaaS, Serviços, Tecnologia..." />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-500">
                    <Target className="w-5 h-5" />
                  </div>
                  ICP — Perfil de Cliente Ideal
                </CardTitle>
                <CardDescription>Defina o tipo de empresa que quer atingir.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de empresa</Label>
                    <Input value={icp.company_type} onChange={(e) => setIcp({ ...icp, company_type: e.target.value })} placeholder="Ex: SaaS B2B, PME..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Indústria</Label>
                    <Input value={icp.industry} onChange={(e) => setIcp({ ...icp, industry: e.target.value })} placeholder="Ex: Tecnologia, Saúde..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Geografia</Label>
                    <Input value={icp.geography} onChange={(e) => setIcp({ ...icp, geography: e.target.value })} placeholder="Ex: Portugal, Europa..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho</Label>
                    <Select value={icp.size_band} onValueChange={(v) => setIcp({ ...icp, size_band: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 pessoas</SelectItem>
                        <SelectItem value="11-50">11-50 pessoas</SelectItem>
                        <SelectItem value="51-200">51-200 pessoas</SelectItem>
                        <SelectItem value="201-1000">201-1000 pessoas</SelectItem>
                        <SelectItem value="1000+">1000+ pessoas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notas adicionais</Label>
                  <Textarea value={icp.notes} onChange={(e) => setIcp({ ...icp, notes: e.target.value })} placeholder="Qualquer detalhe extra sobre o seu ICP..." rows={3} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-500">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  Primeiras contas-alvo
                </CardTitle>
                <CardDescription>Adicione os domínios das empresas que quer analisar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accounts.map((acc, i) => (
                  <div key={i} className="flex items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <Label>Domínio</Label>
                      <Input value={acc.domain} onChange={(e) => { const n = [...accounts]; n[i].domain = e.target.value; setAccounts(n); }} placeholder="exemplo.com" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Nome (opcional)</Label>
                      <Input value={acc.name} onChange={(e) => { const n = [...accounts]; n[i].name = e.target.value; setAccounts(n); }} placeholder="Nome da empresa" />
                    </div>
                    {accounts.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeAccount(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addAccount} className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar conta
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Anterior
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} className="gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400">
                Seguinte <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={completeOnboarding.isPending} className="gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400">
                {completeOnboarding.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Concluir e começar
              </Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
