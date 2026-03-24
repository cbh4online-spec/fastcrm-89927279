import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAccountBriefSettings } from "@/hooks/useAccountBriefSettings";
import { useAccountBriefUsage, getMetricLabel } from "@/hooks/useAccountBriefUsage";
import { Loader2, Building2, Target, Save, Gauge, AlertTriangle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AccountBriefSettingsPage() {
  const { profile, icp, isLoading, updateProfile, updateICP } = useAccountBriefSettings();
  const { allMetrics, currentPeriod } = useAccountBriefUsage();

  const [companyName, setCompanyName] = useState("");
  const [teamType, setTeamType] = useState("");
  const [sellingSector, setSellingSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [sizeBand, setSizeBand] = useState("");

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || "");
      setTeamType(profile.team_type || "");
      setSellingSector(profile.selling_sector || "");
    }
  }, [profile]);

  useEffect(() => {
    if (icp) {
      setIndustry(icp.industry || "");
      setGeography(icp.geography || "");
      setSizeBand(icp.size_band || "");
    }
  }, [icp]);

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="max-w-2xl space-y-6">
          <PageHeader title="Definições" description="Configuração do módulo Account Brief" />

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" /> Perfil da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Tipo de equipa</Label><Input value={teamType} onChange={(e) => setTeamType(e.target.value)} /></div>
              <div className="space-y-2"><Label>Setor</Label><Input value={sellingSector} onChange={(e) => setSellingSector(e.target.value)} /></div>
              <Button size="sm" className="gap-2" onClick={() => updateProfile.mutate({ company_name: companyName, team_type: teamType, selling_sector: sellingSector })} disabled={updateProfile.isPending}>
                <Save className="w-4 h-4" /> Guardar
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> ICP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Indústria</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} /></div>
              <div className="space-y-2"><Label>Geografia</Label><Input value={geography} onChange={(e) => setGeography(e.target.value)} /></div>
              <div className="space-y-2"><Label>Tamanho</Label><Input value={sizeBand} onChange={(e) => setSizeBand(e.target.value)} /></div>
              <Button size="sm" className="gap-2" onClick={() => updateICP.mutate({ industry, geography, size_band: sizeBand })} disabled={updateICP.isPending}>
                <Save className="w-4 h-4" /> Guardar
              </Button>
            </CardContent>
          </Card>
          {/* Usage / Consumo */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Gauge className="w-4 h-4 text-indigo-500" /> Consumo do Plano</CardTitle>
              <Badge variant="outline" className="text-xs">{currentPeriod}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allMetrics.map((m) => (
                  <div key={m.metric_key} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className={m.status === "blocked" ? "text-destructive font-medium" : m.status === "danger" ? "text-orange-500" : "font-medium"}>
                        {m.units_limit >= 99999 ? `${m.units_used} / Ilimitado` : `${m.units_used} / ${m.units_limit}`}
                      </span>
                    </div>
                    <Progress value={m.units_limit >= 99999 ? 0 : m.percentage} className="h-2" />
                    {m.status === "warning" && <p className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> A aproximar-se do limite ({m.percentage}%)</p>}
                    {m.status === "danger" && <p className="text-xs text-orange-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Quase no limite ({m.percentage}%)</p>}
                    {m.status === "blocked" && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Limite atingido — considere fazer upgrade</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
