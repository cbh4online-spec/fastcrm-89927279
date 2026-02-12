import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ArrowRight, Play, Search, Clock, Eye,
  Zap, Target, BarChart3, Gauge, ExternalLink,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

type DemoCategory = "all" | "planeamento" | "automacao" | "resultados" | "eficiencia";

const categoryFilters: { value: DemoCategory; label: string; icon: typeof Zap }[] = [
  { value: "all", label: "Todos", icon: Play },
  { value: "planeamento", label: "Planeamento", icon: Target },
  { value: "automacao", label: "Automação", icon: Zap },
  { value: "resultados", label: "Resultados", icon: BarChart3 },
  { value: "eficiencia", label: "Eficiência", icon: Gauge },
];

const demos = [
  {
    id: "1",
    title: "Configurar Pipeline em 5 Minutos",
    description: "Crie um funil de vendas personalizado com etapas, campos e automações.",
    category: "planeamento" as DemoCategory,
    duration: "4:30",
    views: 234,
    tag: "Essencial",
  },
  {
    id: "2",
    title: "Follow-up Automático com IA",
    description: "Configure automações que enviam follow-ups personalizados com base no comportamento do lead.",
    category: "automacao" as DemoCategory,
    duration: "3:15",
    views: 189,
    tag: "Popular",
  },
  {
    id: "3",
    title: "Dashboard de KPIs Comerciais",
    description: "Visualize taxa de conversão, receita prevista e performance da equipa em tempo real.",
    category: "resultados" as DemoCategory,
    duration: "5:00",
    views: 312,
    tag: "Recomendado",
  },
  {
    id: "4",
    title: "Proposta Gerada por IA",
    description: "Crie propostas comerciais profissionais em menos de 2 minutos com assistência de IA.",
    category: "eficiencia" as DemoCategory,
    duration: "2:45",
    views: 456,
    tag: "Novo",
  },
  {
    id: "5",
    title: "Segmentação Inteligente de Contactos",
    description: "Use filtros avançados e tags para segmentar a base de contactos por potencial.",
    category: "planeamento" as DemoCategory,
    duration: "3:50",
    views: 145,
    tag: "Essencial",
  },
  {
    id: "6",
    title: "Automação de Etapas do Pipeline",
    description: "Leads avançam automaticamente no pipeline quando critérios são cumpridos.",
    category: "automacao" as DemoCategory,
    duration: "4:10",
    views: 198,
    tag: "Avançado",
  },
];

export default function DemosPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DemoCategory>("all");
  const [search, setSearch] = useState("");

  const filtered = demos.filter(d => {
    if (filter !== "all" && d.category !== filter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative container mx-auto px-4 pt-6 pb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/fastclub")}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">
              Biblioteca de Demos
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              FastCRM em Ação
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Demonstrações curtas e práticas organizadas pelos pilares do Método PARE.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Filters */}
        <motion.div {...stagger} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar demos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-muted/40 h-10"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categoryFilters.map(cf => (
              <Button
                key={cf.value}
                variant={filter === cf.value ? "default" : "outline"}
                size="sm"
                className="rounded-full gap-1.5 text-xs"
                onClick={() => setFilter(cf.value)}
              >
                <cf.icon className="w-3.5 h-3.5" />
                {cf.label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Demo grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((demo, i) => (
            <motion.div key={demo.id} {...stagger} transition={{ delay: 0.15 + i * 0.06 }}>
              <Card className="h-full border-border/50 hover:shadow-md transition-all group cursor-pointer">
                <CardContent className="p-0">
                  {/* Thumbnail placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                    </div>
                    <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">
                      {demo.tag}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">{demo.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{demo.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {demo.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {demo.views}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Nenhuma demo encontrada.</p>
          </div>
        )}

        {/* CTA */}
        <motion.div {...stagger} transition={{ delay: 0.6 }} className="rounded-2xl border bg-muted/30 p-8 text-center space-y-3">
          <h3 className="text-lg font-bold text-foreground">Quer experimentar no seu FastCRM?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Cada funcionalidade demonstrada está disponível no FastCRM. Comece o seu trial gratuito.
          </p>
          <Button className="gap-2">
            Abrir FastCRM <ExternalLink className="w-4 h-4" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
