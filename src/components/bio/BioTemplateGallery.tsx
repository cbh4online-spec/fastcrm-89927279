import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateBioPage } from "@/hooks/useBioPages";
import { useCreateBioBlock } from "@/hooks/useBioBlocks";
import { getIconByName } from "@/lib/icons";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface PremiumTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  params: {
    vertical: string;
    objective: string;
    offer: string;
    tone: string;
  };
}

const PREMIUM_TEMPLATES: PremiumTemplate[] = [
  // Serviços
  {
    id: "fitness-coach",
    name: "Coach de Fitness",
    description: "Página para personal trainers e coaches desportivos",
    category: "Serviços",
    icon: "Dumbbell",
    color: "#16a34a",
    params: {
      vertical: "Fitness e Personal Training",
      objective: "Captar novos clientes para treinos personalizados",
      offer: "Plano de treino personalizado + primeira sessão gratuita",
      tone: "Energético",
    },
  },
  {
    id: "business-consulting",
    name: "Consultoria de Negócios",
    description: "Para consultores empresariais e estratégicos",
    category: "Serviços",
    icon: "Briefcase",
    color: "#2563eb",
    params: {
      vertical: "Consultoria de Negócios e Estratégia",
      objective: "Gerar leads qualificados para consultoria estratégica",
      offer: "Diagnóstico empresarial gratuito de 30 minutos",
      tone: "Profissional",
    },
  },
  {
    id: "therapist-wellness",
    name: "Terapeuta / Wellness",
    description: "Ideal para terapeutas, psicólogos e wellness",
    category: "Serviços",
    icon: "Heart",
    color: "#8b5cf6",
    params: {
      vertical: "Terapia e Bem-Estar",
      objective: "Agendar sessões de terapia e acompanhamento",
      offer: "Sessão de avaliação inicial com condições especiais",
      tone: "Elegante",
    },
  },
  // Comércio
  {
    id: "gourmet-restaurant",
    name: "Restaurante Gourmet",
    description: "Para restaurantes, cafés e espaços gastronómicos",
    category: "Comércio",
    icon: "Utensils",
    color: "#dc2626",
    params: {
      vertical: "Restauração e Gastronomia",
      objective: "Aumentar reservas e encomendas online",
      offer: "Menu de degustação exclusivo + reserva com desconto",
      tone: "Casual",
    },
  },
  {
    id: "online-store",
    name: "Loja Online",
    description: "Perfeito para e-commerce e lojas digitais",
    category: "Comércio",
    icon: "ShoppingBag",
    color: "#f59e0b",
    params: {
      vertical: "E-commerce e Loja Online",
      objective: "Aumentar vendas e tráfego para a loja",
      offer: "Cupão de 15% de desconto na primeira compra",
      tone: "Divertido",
    },
  },
  {
    id: "beauty-salon",
    name: "Salão de Beleza",
    description: "Para cabeleireiros, estéticas e spas",
    category: "Comércio",
    icon: "Scissors",
    color: "#ec4899",
    params: {
      vertical: "Beleza e Estética",
      objective: "Captar novos clientes para serviços de beleza",
      offer: "Pack de tratamentos com desconto exclusivo",
      tone: "Elegante",
    },
  },
  // Criativo
  {
    id: "photographer",
    name: "Fotógrafo Profissional",
    description: "Portfolio e contacto para fotógrafos",
    category: "Criativo",
    icon: "Camera",
    color: "#1e1b4b",
    params: {
      vertical: "Fotografia Profissional",
      objective: "Mostrar portfolio e captar sessões fotográficas",
      offer: "Mini-sessão fotográfica com preço especial de lançamento",
      tone: "Minimalista",
    },
  },
  {
    id: "designer-portfolio",
    name: "Designer / Portfolio",
    description: "Showcase de trabalhos para designers criativos",
    category: "Criativo",
    icon: "Palette",
    color: "#6366f1",
    params: {
      vertical: "Design Gráfico e Criativo",
      objective: "Atrair projectos de design e branding",
      offer: "Consultoria de branding gratuita + proposta personalizada",
      tone: "Profissional",
    },
  },
  {
    id: "musician-artist",
    name: "Músico / Artista",
    description: "Links para música, eventos e redes sociais",
    category: "Criativo",
    icon: "Music",
    color: "#7c3aed",
    params: {
      vertical: "Música e Entretenimento",
      objective: "Promover música, eventos e aumentar seguidores",
      offer: "Acesso exclusivo a conteúdo e pré-venda de bilhetes",
      tone: "Energético",
    },
  },
  // Digital
  {
    id: "marketing-agency",
    name: "Agência de Marketing",
    description: "Para agências digitais e equipas de marketing",
    category: "Digital",
    icon: "Target",
    color: "#0891b2",
    params: {
      vertical: "Marketing Digital e Publicidade",
      objective: "Gerar leads para serviços de marketing digital",
      offer: "Auditoria digital gratuita do negócio + plano de acção",
      tone: "Profissional",
    },
  },
  {
    id: "tech-freelancer",
    name: "Freelancer Tech",
    description: "Para programadores, devs e consultores tech",
    category: "Digital",
    icon: "Brain",
    color: "#059669",
    params: {
      vertical: "Tecnologia e Desenvolvimento",
      objective: "Captar projectos freelance de desenvolvimento",
      offer: "Estimativa gratuita do projecto em 24h",
      tone: "Casual",
    },
  },
  {
    id: "influencer-creator",
    name: "Influencer / Creator",
    description: "Para criadores de conteúdo e influencers",
    category: "Digital",
    icon: "Sparkles",
    color: "#e11d48",
    params: {
      vertical: "Criação de Conteúdo e Influência Digital",
      objective: "Monetizar audiência e atrair parcerias de marca",
      offer: "Media kit gratuito + proposta de parceria",
      tone: "Divertido",
    },
  },
];

const CATEGORIES = ["Serviços", "Comércio", "Criativo", "Digital"];

const LOADING_MESSAGES = [
  "A analisar o nicho...",
  "A criar copy persuasivo...",
  "A optimizar para conversão...",
  "A aplicar framework AIDA...",
  "Quase pronto...",
];

interface BioTemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPageCreated: (pageId: string) => void;
}

export function BioTemplateGallery({ open, onOpenChange, onPageCreated }: BioTemplateGalleryProps) {
  const createPage = useCreateBioPage();
  const createBlock = useCreateBioBlock();
  const [generating, setGenerating] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [phase, setPhase] = useState<"gallery" | "generating" | "success">("gallery");
  const [generatedName, setGeneratedName] = useState("");

  useEffect(() => {
    if (phase !== "generating") return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 600);
    const msgInterval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => {
      clearInterval(interval);
      clearInterval(msgInterval);
    };
  }, [phase]);

  const handleSelect = async (template: PremiumTemplate) => {
    setGenerating(template.id);
    setPhase("generating");
    setProgress(0);
    setMsgIndex(0);

    try {
      const { data, error } = await supabase.functions.invoke("bio-ai-builder", {
        body: template.params,
      });

      if (error) throw new Error(error.message || "Erro ao gerar página");
      if (data?.error) throw new Error(data.error);

      setProgress(100);
      setGeneratedName(data.pageName || template.name);

      const page = await createPage.mutateAsync({
        name: data.pageName || template.name,
        slug: data.slug || template.id,
        primary_color: data.primaryColor || template.color,
      });

      for (let i = 0; i < data.blocks.length; i++) {
        await createBlock.mutateAsync({
          bio_page_id: page.id,
          block_type: data.blocks[i].type,
          content: data.blocks[i].content || {},
          order_index: i,
        });
      }

      setPhase("success");
      setTimeout(() => {
        onOpenChange(false);
        setPhase("gallery");
        setGenerating(null);
        onPageCreated(page.id);
        toast.success("Página gerada com IA!");
      }, 1800);
    } catch (e: any) {
      console.error("Template generation error:", e);
      toast.error(e.message || "Erro ao gerar página");
      setPhase("gallery");
      setGenerating(null);
    }
  };

  const filtered = activeCategory
    ? PREMIUM_TEMPLATES.filter((t) => t.category === activeCategory)
    : PREMIUM_TEMPLATES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Templates Premium
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {phase === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16 gap-6"
            >
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-lg">A gerar a tua página...</p>
                <p className="text-sm text-muted-foreground">{LOADING_MESSAGES[msgIndex]}</p>
              </div>
              <div className="w-64 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {phase === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold text-lg">Página criada!</p>
              <p className="text-sm text-muted-foreground">{generatedName}</p>
            </motion.div>
          )}

          {phase === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-4 overflow-hidden"
            >
              {/* Category filters */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={activeCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(null)}
                >
                  Todos
                </Button>
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Template grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-1">
                {filtered.map((template) => {
                  const Icon = getIconByName(template.icon);
                  return (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleSelect(template)}
                    >
                      {/* Color header */}
                      <div
                        className="h-24 flex items-center justify-center relative"
                        style={{
                          background: `linear-gradient(135deg, ${template.color}, ${template.color}dd)`,
                        }}
                      >
                        <Icon className="h-10 w-10 text-white/90" />
                        <Badge
                          variant="secondary"
                          className="absolute top-2 right-2 text-[10px] bg-white/20 text-white border-0 backdrop-blur-sm"
                        >
                          {template.params.tone}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="p-3 space-y-1.5">
                        <h3 className="font-semibold text-sm">{template.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                        <div className="pt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {template.category}
                          </Badge>
                        </div>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" /> Usar Template
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
