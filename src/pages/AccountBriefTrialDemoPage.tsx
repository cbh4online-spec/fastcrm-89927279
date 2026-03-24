import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountBriefTrialDemo } from "@/hooks/useAccountBriefTrialDemo";
import { Sparkles, Trash2, Building2, TrendingUp, Eye, Mail, FileText, Layers, Loader2 } from "lucide-react";

export default function AccountBriefTrialDemoPage() {
  const { seedDemo, cleanDemo, DEMO_ACCOUNTS } = useAccountBriefTrialDemo();

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="max-w-3xl space-y-6">
          <PageHeader
            title="Experiência Demo"
            description="Crie contas de demonstração para explorar todas as funcionalidades do Account Brief"
          />

          {/* Value prop */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-8 text-center space-y-4">
              <Sparkles className="w-12 h-12 mx-auto text-primary" />
              <h2 className="text-xl font-bold">Explore o Account Brief em ação</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Crie 3 contas demo com scores, briefings e dados realistas para testar todas as funcionalidades antes de adicionar as suas contas reais.
              </p>
              <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Score completo</span>
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Watchlist ativa</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Outreach pronto</span>
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Export PDF</span>
                <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Segmentos</span>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button onClick={() => seedDemo.mutate()} disabled={seedDemo.isPending} className="gap-2">
                  {seedDemo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Criar Contas Demo
                </Button>
                <Button variant="outline" onClick={() => cleanDemo.mutate()} disabled={cleanDemo.isPending} className="gap-2 text-destructive">
                  {cleanDemo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remover Demo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview of demo accounts */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Contas incluídas na demo</h3>
            {DEMO_ACCOUNTS.map((account) => (
              <Card key={account.domain} className="border-0 shadow-lg">
                <CardContent className="py-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {account.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{account.name}</p>
                      <Badge variant="outline" className="text-[10px]">{account.probable_sector}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{account.executive_summary}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={
                        account.total_score >= 70
                          ? "bg-emerald-500/20 text-emerald-600"
                          : account.total_score >= 50
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      }>
                        Score: {account.total_score}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{account.probable_geography}</Badge>
                      {account.favorite && <Badge variant="outline" className="text-[10px] text-amber-500">⭐ Favorita</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Packaging info */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Posicionamento Comercial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Account Brief — Intelligence Comercial B2B</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Transforme qualquer website numa ficha de intelligence comercial acionável. Ideal para SDRs, founders, agências outbound e consultores comerciais.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <BenefitCard icon="🎯" title="Briefings Automáticos" description="Análise completa do site com IA — identidade, oferta, sinais de crescimento e personalização" />
                <BenefitCard icon="📊" title="Scoring Inteligente" description="Score 0-100 com sub-dimensões e comparação entre contas para priorizar pipeline" />
                <BenefitCard icon="⚡" title="Ação Comercial" description="Geração de emails, watchlist automática, alertas de mudança e exportação PDF" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <OutputCard label="Briefing estruturado" />
                <OutputCard label="Score com breakdown" />
                <OutputCard label="Email de outreach" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}

function BenefitCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
      <p className="text-lg">{icon}</p>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function OutputCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-muted-foreground/20">
      <span className="text-emerald-500 text-sm">✓</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
