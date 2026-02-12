import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, CheckCircle, Clock } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const roadmapItems = [
  { title: "Coach IA com Contexto de Pipeline", status: "concluido", quarter: "Q4 2024" },
  { title: "Propostas Geradas por IA", status: "concluido", quarter: "Q1 2025" },
  { title: "FastMatch — Motor de Conexões", status: "concluido", quarter: "Q1 2025" },
  { title: "Automações com Condições Compostas", status: "em-curso", quarter: "Q2 2025" },
  { title: "Dashboard Executivo Personalizado", status: "em-curso", quarter: "Q2 2025" },
  { title: "Integrações Nativas com WhatsApp Business", status: "planeado", quarter: "Q3 2025" },
  { title: "Portal de Cliente com Self-Service", status: "planeado", quarter: "Q3 2025" },
];

const statusConfig = {
  concluido: { label: "Concluído", variant: "default" as const, icon: CheckCircle },
  "em-curso": { label: "Em Curso", variant: "secondary" as const, icon: Rocket },
  planeado: { label: "Planeado", variant: "outline" as const, icon: Clock },
};

export default function RoadmapPage() {
  return (
    <SubchannelLayout
      title="Roadmap e Atualizações"
      subtitle="Evolução contínua do ecossistema FastCRM."
      zoneBadge="FastCRM em Ação"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "FastCRM em Ação", href: "/dashboard/fastclub/demos" },
        { label: "Roadmap" },
      ]}
      backPath="/dashboard/fastclub/demos"
    >
      <div className="space-y-4">
        {roadmapItems.map((item, i) => {
          const cfg = statusConfig[item.status as keyof typeof statusConfig];
          return (
            <motion.div key={item.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Card className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <cfg.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.quarter}</p>
                    </div>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </SubchannelLayout>
  );
}
