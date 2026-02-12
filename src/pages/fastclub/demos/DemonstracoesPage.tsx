import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Eye } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const demos = [
  { title: "Configurar Pipeline em 5 Minutos", description: "Crie um funil de vendas personalizado com etapas, campos e automações.", duration: "4:30", views: 234, tag: "Essencial" },
  { title: "Follow-up Automático com IA", description: "Configure automações que enviam follow-ups personalizados.", duration: "3:15", views: 189, tag: "Popular" },
  { title: "Dashboard de KPIs Comerciais", description: "Visualize taxa de conversão, receita prevista e performance em tempo real.", duration: "5:00", views: 312, tag: "Recomendado" },
  { title: "Proposta Gerada por IA", description: "Crie propostas profissionais em menos de 2 minutos com assistência de IA.", duration: "2:45", views: 456, tag: "Novo" },
];

export default function DemonstracoesPage() {
  return (
    <SubchannelLayout
      title="Demonstrações"
      subtitle="Vídeos e demos interativos das funcionalidades do FastCRM."
      zoneBadge="FastCRM em Ação"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "FastCRM em Ação", href: "/dashboard/fastclub/demos" },
        { label: "Demonstrações" },
      ]}
      backPath="/dashboard/fastclub/demos"
      ctaLabel="Abrir FastCRM"
      ctaPath="/dashboard"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        {demos.map((demo, i) => (
          <motion.div key={demo.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <Card className="h-full border-border/50 hover:shadow-md transition-all group cursor-pointer">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-t-lg flex items-center justify-center relative">
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </div>
                  <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">{demo.tag}</Badge>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm text-foreground">{demo.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{demo.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {demo.duration}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {demo.views}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </SubchannelLayout>
  );
}
