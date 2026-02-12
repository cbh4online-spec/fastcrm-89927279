import { motion } from "framer-motion";
import { ArrowLeft, Users, TrendingUp, Link2, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FastCRMDeepLink } from "@/components/fastclub/FastCRMDeepLink";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_SECTIONS = [
  {
    title: "Estratégias de Networking",
    description: "Aprenda a maximizar o valor da rede para o seu negócio.",
    items: [
      "Como construir relações estratégicas em B2B",
      "Framework de qualificação de parceiros",
      "Métricas de ROI em networking profissional",
    ],
  },
  {
    title: "Casos Reais",
    description: "Conexões que geraram resultados reais.",
    items: [
      "De parceiro a cliente: como uma conexão gerou 25k€",
      "Joint ventures: combinar serviços complementares",
      "Referral engine: sistema de indicações mútuas",
    ],
  },
  {
    title: "Cultura da Rede",
    description: "Princípios e boas práticas da comunidade FastMatch.",
    items: [
      "Reciprocidade estratégica vs transacional",
      "Como manter reputação elevada",
      "Etiqueta profissional em conexões digitais",
    ],
  },
];

export default function RedePrivadaPage() {
  const navigate = useNavigate();

  // Fetch aggregate stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["rede-privada-stats"],
    queryFn: async () => {
      const [profilesRes, connectionsRes] = await Promise.all([
        supabase
          .from("fastmatch_profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_verified", true),
        supabase
          .from("fastmatch_connections")
          .select("id", { count: "exact", head: true }),
      ]);

      const totalMembers = profilesRes.count ?? 0;
      const totalConnections = connectionsRes.count ?? 0;
      // Estimated match rate: connections / members (capped at 100%)
      const matchRate = totalMembers > 0
        ? Math.min(Math.round((totalConnections / totalMembers) * 100), 100)
        : 0;

      return [
        { label: "Membros Verificados", value: String(totalMembers), icon: Users },
        { label: "Conexões Feitas", value: String(totalConnections), icon: Link2 },
        { label: "Taxa de Match", value: `${matchRate}%`, icon: TrendingUp },
      ];
    },
  });

  // Fetch dynamic content sections
  const { data: dbSections } = useQuery({
    queryKey: ["rede-privada-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fastclub_content_sections")
        .select("title, section_key, content, metadata")
        .eq("page_key", "rede-privada")
        .order("sort_order", { ascending: true });

      if (!data || data.length === 0) return null;

      return data.map((s) => {
        const meta = s.metadata as Record<string, unknown> | null;
        const desc = (meta?.description as string) ?? "";
        const contentStr = s.content ?? "";
        // Content may be JSON array or newline-separated
        let items: string[] = [];
        try {
          const parsed = JSON.parse(contentStr);
          if (Array.isArray(parsed)) items = parsed;
        } catch {
          items = contentStr.split("\n").filter(Boolean);
        }
        return { title: s.title ?? s.section_key, description: desc, items };
      });
    },
  });

  const sections = dbSections ?? FALLBACK_SECTIONS;
  const displayStats = stats ?? [
    { label: "Membros Verificados", value: "—", icon: Users },
    { label: "Conexões Feitas", value: "—", icon: Link2 },
    { label: "Taxa de Match", value: "—", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/fastclub")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rede Privada</h1>
              <p className="text-sm text-muted-foreground">
                Educação, estratégias e cultura da rede de conexões
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-foreground text-sm">Pronto para encontrar o seu próximo parceiro?</p>
            <p className="text-xs text-muted-foreground">O motor de matching vive no FastCRM.</p>
          </div>
          <FastCRMDeepLink
            targetPath="/dashboard/fastmatch"
            variant="default"
            size="sm"
            className="gap-1.5"
          >
            Abrir FastMatch no CRM
          </FastCRMDeepLink>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-4">
          {displayStats.map((stat) => (
            <Card key={stat.label} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Content Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
            >
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BarChart3 className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
