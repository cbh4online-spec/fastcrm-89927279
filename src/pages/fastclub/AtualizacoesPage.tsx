import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Puzzle, TrendingUp } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_UPDATES = [
  { title: "FastMatch — Motor de Conexões Estratégicas", type: "Nova Funcionalidade", date: "Jan 2025", description: "Motor de matching inteligente que conecta membros com base em perfil, setor e complementaridade de serviços." },
  { title: "Coach IA com Contexto de Pipeline", type: "Melhoria", date: "Dez 2024", description: "O Coach IA agora utiliza o contexto completo do pipeline para sugestões mais relevantes e acionáveis." },
  { title: "Integração com WhatsApp Business", type: "Integração", date: "Nov 2024", description: "Envie e receba mensagens WhatsApp diretamente do inbox do FastCRM." },
];

const typeConfig = {
  "Nova Funcionalidade": { icon: Rocket, variant: "default" as const },
  "Melhoria": { icon: TrendingUp, variant: "secondary" as const },
  "Integração": { icon: Puzzle, variant: "outline" as const },
};

export default function AtualizacoesPage() {
  const { data: dbUpdates } = useQuery({
    queryKey: ["fastclub-atualizacoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fastclub_content_sections")
        .select("title, content, metadata")
        .eq("page_key", "atualizacoes")
        .order("sort_order", { ascending: true });
      if (!data || data.length === 0) return null;
      return data.map((s) => {
        const meta = s.metadata as Record<string, unknown> | null;
        return {
          title: s.title ?? "",
          type: (meta?.type as string) ?? "Melhoria",
          date: (meta?.date as string) ?? "",
          description: s.content ?? "",
        };
      });
    },
  });

  const updates = dbUpdates ?? FALLBACK_UPDATES;

  return (
    <SubchannelLayout
      title="Atualizações do Ecossistema"
      subtitle="Novas funcionalidades, melhorias e integrações do FastCRM."
      zoneBadge="Comunicação Institucional"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Atualizações" },
      ]}
      backPath="/dashboard/fastclub"
    >
      <div className="space-y-4">
        {updates.map((update, i) => {
          const cfg = typeConfig[update.type as keyof typeof typeConfig] ?? typeConfig["Melhoria"];
          return (
            <motion.div key={update.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Card className="border-border/50">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <cfg.icon className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm text-foreground">{update.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.variant} className="text-[10px]">{update.type}</Badge>
                      <span className="text-xs text-muted-foreground">{update.date}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{update.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </SubchannelLayout>
  );
}
