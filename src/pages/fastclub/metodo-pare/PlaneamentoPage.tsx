import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK = {
  intro: "O planeamento é o primeiro pilar do Método PARE. Antes de agir, é necessário estruturar: definir pipelines, segmentar contactos e configurar o CRM para o seu modelo de negócio.",
  templates: [
    "Template de Pipeline para Consultoria B2B",
    "Modelo de Segmentação por Potencial e Urgência",
    "Checklist de Campos Personalizados por Setor",
  ],
  tips: [
    "Comece por mapear o seu funil real antes de criar o pipeline digital",
    "Defina 4 a 6 etapas — simplicidade gera adoção",
    "Use tags para segmentação dinâmica sem duplicar pipelines",
  ],
};

export default function PlaneamentoPage() {
  const { data: content } = useQuery({
    queryKey: ["pare-planeamento-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fastclub_content_sections")
        .select("title, section_key, content, metadata")
        .eq("page_key", "pare-planeamento")
        .order("sort_order", { ascending: true });
      return data && data.length > 0 ? data : null;
    },
  });

  return (
    <SubchannelLayout
      title="Planeamento"
      subtitle="Estruturar antes de agir — definir pipelines, segmentar contactos e configurar o CRM."
      zoneBadge="Método PARE"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Método PARE", href: "/dashboard/fastclub/metodo-pare" },
        { label: "Planeamento" },
      ]}
      backPath="/dashboard/fastclub/metodo-pare"
      ctaLabel="Abrir FastCRM"
      ctaPath="/dashboard"
      gradient="from-blue-600 to-blue-400"
    >
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">Visão Geral</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{FALLBACK.intro}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {FALLBACK.templates.map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{t}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Dicas Práticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {FALLBACK.tips.map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{t}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </SubchannelLayout>
  );
}
