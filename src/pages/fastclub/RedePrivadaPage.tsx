import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Users, TrendingUp, Link2, BookOpen, UserCheck, BarChart3, Briefcase, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { FastCRMDeepLink } from "@/components/fastclub/FastCRMDeepLink";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const subchannels = [
  { title: "Como Funciona", description: "Regras, ética e estrutura de quotas.", icon: BookOpen, href: "/dashboard/fastclub/rede-privada/como-funciona", color: "from-blue-600 to-blue-400" },
  { title: "Otimizar Perfil", description: "Modelos de oferta, procura e exemplos.", icon: UserCheck, href: "/dashboard/fastclub/rede-privada/otimizar-perfil", color: "from-amber-500 to-orange-400" },
  { title: "Indicadores da Rede", description: "Dados agregados e tendências.", icon: BarChart3, href: "/dashboard/fastclub/rede-privada/indicadores", color: "from-emerald-500 to-green-400" },
  { title: "Negócios Fechados", description: "Casos reais aprovados.", icon: Briefcase, href: "/dashboard/fastclub/rede-privada/negocios-fechados", color: "from-violet-500 to-purple-400" },
  { title: "Estratégias de Abordagem", description: "Qualificação, comunicação e conversão.", icon: Target, href: "/dashboard/fastclub/rede-privada/estrategias", color: "from-rose-500 to-pink-400" },
];

export default function RedePrivadaPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["rede-privada-stats"],
    queryFn: async () => {
      const [profilesRes, connectionsRes] = await Promise.all([
        supabase.from("fastmatch_profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("fastmatch_connections").select("id", { count: "exact", head: true }),
      ]);
      const totalMembers = profilesRes.count ?? 0;
      const totalConnections = connectionsRes.count ?? 0;
      const matchRate = totalMembers > 0 ? Math.min(Math.round((totalConnections / totalMembers) * 100), 100) : 0;
      return [
        { label: "Membros Verificados", value: String(totalMembers), icon: Users },
        { label: "Conexões Feitas", value: String(totalConnections), icon: Link2 },
        { label: "Taxa de Match", value: `${matchRate}%`, icon: TrendingUp },
      ];
    },
  });

  const displayStats = stats ?? [
    { label: "Membros Verificados", value: "—", icon: Users },
    { label: "Conexões Feitas", value: "—", icon: Link2 },
    { label: "Taxa de Match", value: "—", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative container mx-auto px-4 pt-6 pb-12">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/fastclub")} className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">Hub Rede Privada</Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">Rede Privada</h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">Educação, estratégias e cultura da rede de conexões estratégicas.</p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* CTA */}
        <motion.div {...stagger} transition={{ delay: 0.1 }} className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground text-sm">Pronto para encontrar o seu próximo parceiro?</p>
            <p className="text-xs text-muted-foreground">O motor de matching vive no FastCRM.</p>
          </div>
          <FastCRMDeepLink targetPath="/dashboard/fastmatch" variant="default" size="sm" className="gap-1.5">Abrir FastMatch no CRM</FastCRMDeepLink>
        </motion.div>

        {/* Stats */}
        <motion.div {...stagger} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-4">
          {displayStats.map((stat) => (
            <Card key={stat.label} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><stat.icon className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-lg font-bold text-foreground">{statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Subchannels */}
        {subchannels.map((sub, i) => (
          <motion.div key={sub.title} {...stagger} transition={{ delay: 0.2 + i * 0.06 }}>
            <Card className="border-border/50 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(sub.href)}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className={`bg-gradient-to-br ${sub.color} p-6 md:w-40 flex items-center justify-center text-white shrink-0`}>
                    <sub.icon className="w-8 h-8" />
                  </div>
                  <div className="p-5 flex-1 space-y-1">
                    <h3 className="text-base font-bold text-foreground">{sub.title}</h3>
                    <p className="text-sm text-muted-foreground">{sub.description}</p>
                    <div className="flex items-center gap-2 text-xs text-primary font-medium pt-1">
                      Explorar <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
