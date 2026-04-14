import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { usePublicMarketplaceWorkspace } from "@/hooks/c2c/usePublicMarketplaceWorkspace";
import { usePublicMarketplaceTheme } from "@/hooks/c2c/usePublicMarketplaceTheme";
import { useMarketplaceConfig } from "@/hooks/useMarketplace";
import { getMarketplaceBaseUrlFromConfig } from "@/utils/getPublicDomain";
import { getShareUrl } from "@/utils/getShareUrl";
import { usePublicLivestreams, type PublicLivestream } from "@/hooks/c2c/usePublicLivestreams";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ListingCard } from "@/components/c2c/ListingCard";
import { MarketplaceSearchOverlay } from "@/components/c2c/MarketplaceSearchOverlay";
import { MarketplaceFooter } from "@/components/c2c/MarketplaceFooter";
import { useC2CSponsoredListings } from "@/hooks/useC2CBoost";
import type { C2CListing, C2CCategory, C2CListingFilters } from "@/hooks/useC2CListings";
import { getTrendingScore } from "@/hooks/useMarketplaceAnalytics";
import {
  Store, Search, Sparkles, TrendingUp, Clock, ChevronRight, ChevronLeft,
  ShieldCheck, Truck, Award, MessageCircle, Plus, Users, ArrowRight,
  DollarSign, Eye, Zap, Star, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareButtons } from "@/components/c2c/ShareButtons";
import { SellerStories } from "@/components/c2c/marketplace/SellerStories";

/* ── Public listings ─────────────────────────────────────────────── */
function usePublicListings(workspaceId: string | undefined, filters?: C2CListingFilters) {
  return useQuery({
    queryKey: ["c2c-public-listings", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("c2c_listings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .eq("moderation_status", "approved");

      if (filters?.category) query = query.eq("category_id", filters.category);
      if (filters?.minPrice) query = query.gte("price", filters.minPrice);
      if (filters?.maxPrice) query = query.lte("price", filters.maxPrice);
      if (filters?.condition) query = query.eq("condition", filters.condition);
      if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as C2CListing[];
    },
    enabled: !!workspaceId,
  });
}

function usePublicCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as C2CCategory[];
    },
    enabled: !!workspaceId,
  });
}

/* ── Category carousel 3D ────────────────────────────────── */
function CategoryCarousel({ categories, onSelect, selected }: {
  categories: C2CCategory[];
  onSelect: (id: string | undefined) => void;
  selected?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (categories.length === 0) return null;

  return (
    <div className="relative py-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/60 text-gray-600 hidden md:flex hover:bg-white hover:shadow-xl transition-all"
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x py-3 px-2"
        style={{ perspective: "1000px" }}
      >
        {categories.map((cat, index) => {
          const isSelected = selected === cat.id;
          const isHovered = hoveredId === cat.id;

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, rotateY: -30, scale: 0.8 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
              whileHover={{
                rotateY: 8,
                rotateX: -5,
                scale: 1.08,
                z: 50,
                transition: { type: "spring", stiffness: 300, damping: 15 },
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(isSelected ? undefined : cat.id)}
              onMouseEnter={() => setHoveredId(cat.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "flex flex-col items-center gap-3 px-5 py-4 rounded-2xl border-2 shrink-0 snap-start min-w-[120px] relative overflow-hidden",
                "transition-colors duration-300",
                isSelected
                  ? "bg-gradient-to-br from-[#09B1BA]/15 to-[#09B1BA]/5 border-[#09B1BA] shadow-lg shadow-[#09B1BA]/20"
                  : "bg-white border-gray-200/80 hover:border-[#09B1BA]/40"
              )}
              style={{
                transformStyle: "preserve-3d",
                boxShadow: isHovered
                  ? "0 20px 40px -15px rgba(9, 177, 186, 0.25), 0 10px 20px -10px rgba(0,0,0,0.1)"
                  : isSelected
                  ? "0 10px 30px -10px rgba(9, 177, 186, 0.3)"
                  : "0 4px 12px -4px rgba(0,0,0,0.08)",
              }}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 bg-gradient-to-br from-[#09B1BA]/10 to-transparent"
                animate={{ opacity: isHovered || isSelected ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />

              {/* 3D Icon container */}
              <motion.div
                className={cn(
                  "relative w-14 h-14 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br",
                  isSelected
                    ? "from-[#09B1BA] to-[#078E96] text-white"
                    : "from-gray-100 to-gray-50 text-gray-500"
                )}
                style={{ transformStyle: "preserve-3d", transform: "translateZ(20px)" }}
                animate={{
                  rotateZ: isHovered ? [0, -5, 5, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-9 h-9 object-contain rounded-lg" />
                ) : (
                  <span className="text-2xl">{cat.icon || "📦"}</span>
                )}

                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/30 to-transparent"
                  animate={{
                    x: isHovered ? ["-100%", "200%"] : "-100%",
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ clipPath: "inset(0)" }}
                />
              </motion.div>

              {/* Label */}
              <motion.span
                className={cn(
                  "text-xs font-semibold text-center leading-tight relative z-10",
                  isSelected ? "text-[#09B1BA]" : "text-gray-600"
                )}
                style={{ transform: "translateZ(10px)" }}
              >
                {cat.name}
              </motion.span>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="category-indicator"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[#09B1BA]"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/60 text-gray-600 hidden md:flex hover:bg-white hover:shadow-xl transition-all"
        onClick={() => scroll("right")}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

/* ── Section Carousel ────────────────────────────────────────────── */
function SectionCarousel({ title, icon, listings, onNavigate, seeMoreHref, sponsoredIds = [] }: {
  title: string;
  icon: React.ReactNode;
  listings: C2CListing[];
  onNavigate: (id: string) => void;
  seeMoreHref?: () => void;
  sponsoredIds?: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };
  if (listings.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">{icon}{title}</h2>
        {seeMoreHref && (
          <Button variant="ghost" size="sm" className="gap-1 text-[#09B1BA] hover:text-[#078E96]" onClick={seeMoreHref}>
            ver mais <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="relative">
        <Button variant="ghost" size="icon" className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hidden md:flex" onClick={() => scroll("left")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-2">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="carousel"
              isFavorite={false}
              onToggleFavorite={() => {}}
              onClick={() => onNavigate(listing.id)}
              isSponsored={sponsoredIds.includes(listing.id)}
            />
          ))}
        </div>
        <Button variant="ghost" size="icon" className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hidden md:flex" onClick={() => scroll("right")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

/* ── Feature Detail Dialog ────────────────────────────────────────── */

const featureDetails = [
  {
    icon: ShieldCheck,
    label: "Compra Segura",
    desc: "Transações protegidas",
    title: "Compra 100% Segura",
    content: [
      { heading: "Pagamentos protegidos", text: "Todos os pagamentos são processados de forma segura via Stripe. O dinheiro só é libertado ao vendedor após confirmação de receção." },
      { heading: "Sistema de Escrow", text: "O valor da compra fica retido numa conta de garantia até o comprador confirmar que recebeu o artigo em boas condições." },
      { heading: "Garantia de reembolso", text: "Se o artigo não corresponder à descrição ou não for entregue, recebes o reembolso total. Sem complicações." },
      { heading: "Suporte dedicado", text: "Em caso de disputa, a nossa equipa de mediação intervém para garantir uma resolução justa para ambas as partes." },
    ],
  },
  {
    icon: Users,
    label: "Comunidade Ativa",
    desc: "Milhares de utilizadores",
    title: "Comunidade de Confiança",
    content: [
      { heading: "Vendedores verificados", text: "Cada vendedor passa por um processo de verificação de identidade antes de poder publicar. Procura o selo azul de verificado." },
      { heading: "Sistema de avaliações", text: "Após cada transação, compradores e vendedores avaliam-se mutuamente com estrelas e comentários públicos." },
      { heading: "Badges de reputação", text: "Vendedores ganham badges como 'Super Seller' e 'Top Rated' baseado no seu histórico de vendas e avaliações." },
      { heading: "Chat integrado", text: "Comunica diretamente com vendedores através do chat da plataforma. Sem partilhar dados pessoais." },
    ],
  },
  {
    icon: DollarSign,
    label: "Sem Taxas p/ Comprador",
    desc: "Compra sem comissões",
    title: "Zero Taxas para Compradores",
    content: [
      { heading: "Compra sem custos extra", text: "Enquanto comprador, o preço que vês é o preço que pagas. Não existem comissões escondidas nem taxas de serviço." },
      { heading: "Comissão apenas para vendedores", text: "A plataforma cobra apenas 5% de comissão sobre cada venda concluída. Este custo é suportado exclusivamente pelo vendedor." },
      { heading: "Envio transparente", text: "Os custos de envio são sempre apresentados de forma clara antes de confirmar a compra. Sem surpresas." },
      { heading: "Negociação livre", text: "Podes fazer ofertas e negociar preços diretamente com o vendedor através do sistema de propostas." },
    ],
  },
  {
    icon: Zap,
    label: "Publicação Rápida",
    desc: "Anuncia em 2 minutos",
    title: "Publica em 2 Minutos",
    content: [
      { heading: "1. Tira fotos", text: "Fotografa o teu artigo com o telemóvel. Adiciona até 10 imagens para mostrar todos os detalhes." },
      { heading: "2. Descreve o produto", text: "Preenche o título, descrição, categoria e estado do artigo. A IA pode ajudar-te a escrever a descrição perfeita." },
      { heading: "3. Define o preço", text: "Escolhe o preço de venda. Vê sugestões baseadas em artigos semelhantes no marketplace." },
      { heading: "4. Publica!", text: "Clica em publicar e o teu anúncio fica imediatamente visível para milhares de compradores." },
    ],
  },
];

function FeatureDetailDialog({ feature, open, onOpenChange }: {
  feature: typeof featureDetails[number] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!feature) return null;
  const Icon = feature.icon;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#09B1BA]/10">
              <Icon className="h-6 w-6 text-[#09B1BA]" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">{feature.title}</DialogTitle>
          </div>
          <DialogDescription className="text-gray-500 sr-only">{feature.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {feature.content.map((item, i) => (
            <div key={i} className="space-y-1">
              <h4 className="font-semibold text-sm text-[#09B1BA]">{item.heading}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Hero Banner Carousel (Vinted-style) ─────────────────────────── */
import heroBanner1 from "@/assets/marketplace/hero-banner-1.jpg";
import heroBanner2 from "@/assets/marketplace/hero-banner-2.jpg";
import heroBanner3 from "@/assets/marketplace/hero-banner-3.jpg";

const HERO_BANNERS = [
  {
    image: heroBanner1,
    tag: "Novo",
    headline: "Compra e vende\nentre utilizadores reais",
    subtitle: "O teu marketplace de confiança. Sem taxas para compradores.",
    ctaLabel: "Explorar",
    ctaSecondary: "Vender agora",
    gradient: "from-[#09B1BA]/90 via-[#09B1BA]/60 to-transparent",
  },
  {
    image: heroBanner2,
    tag: "Tendências",
    headline: "Milhares de artigos\nà tua espera",
    subtitle: "Moda, eletrónica, livros, desporto e muito mais.",
    ctaLabel: "Descobrir",
    ctaSecondary: "Publicar anúncio",
    gradient: "from-gray-900/80 via-gray-900/50 to-transparent",
  },
  {
    image: heroBanner3,
    tag: "Sustentável",
    headline: "Dá nova vida\naos teus objetos",
    subtitle: "Publica em 2 minutos. Comissão de apenas 5%.",
    ctaLabel: "Começar",
    ctaSecondary: "Como funciona",
    gradient: "from-[#09B1BA]/85 via-[#09B1BA]/50 to-transparent",
  },
];

function HeroSection({ onExplore, onSell }: { onExplore: () => void; onSell: () => void }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((p) => (p + 1) % HERO_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const banner = HERO_BANNERS[current];

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <section className="relative overflow-hidden bg-gray-900" style={{ height: "clamp(320px, 50vw, 480px)" }}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0"
        >
          {/* Background image */}
          <img
            src={banner.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            width={1920}
            height={640}
          />
          {/* Gradient overlay */}
          <div className={cn("absolute inset-0 bg-gradient-to-r", banner.gradient)} />

          {/* Content */}
          <div className="relative h-full container mx-auto px-4 flex items-center">
            <div className="max-w-lg space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs font-semibold">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {banner.tag}
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-3xl md:text-5xl font-extrabold leading-tight text-white whitespace-pre-line drop-shadow-lg"
              >
                {banner.headline}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-base md:text-lg text-white/90 max-w-md drop-shadow"
              >
                {banner.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-wrap gap-3 pt-2"
              >
                <Button
                  size="lg"
                  className="rounded-full font-semibold bg-white text-[#09B1BA] hover:bg-gray-100 border-0 shadow-lg gap-2"
                  onClick={onExplore}
                >
                  <Search className="h-4 w-4" />
                  {banner.ctaLabel}
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full font-semibold text-white border border-white/40 hover:bg-white/20 hover:text-white gap-2"
                  onClick={onSell}
                >
                  <Plus className="h-4 w-4" />
                  {banner.ctaSecondary}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots navigation */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {HERO_BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              i === current ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
            )}
            aria-label={`Banner ${i + 1}`}
          />
        ))}
      </div>

      {/* Side arrows */}
      <button
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/40 transition-colors hidden md:flex"
        onClick={() => { setDirection(-1); setCurrent((p) => (p - 1 + HERO_BANNERS.length) % HERO_BANNERS.length); }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/40 transition-colors hidden md:flex"
        onClick={() => { setDirection(1); setCurrent((p) => (p + 1) % HERO_BANNERS.length); }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}

/* ── How it works section ────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { icon: Eye, title: "Descobre", desc: "Explora milhares de produtos publicados por outros utilizadores." },
    { icon: MessageCircle, title: "Negoceia", desc: "Fala diretamente com o vendedor via chat integrado." },
    { icon: ShieldCheck, title: "Compra Seguro", desc: "Pagamento protegido pela plataforma com garantia." },
  ];
  return (
    <section className="py-12 bg-white border-t border-gray-200">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">Como funciona</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.title} className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#09B1BA]/10 flex items-center justify-center">
                <step.icon className="h-7 w-7 text-[#09B1BA]" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Sell CTA Section ────────────────────────────────────────────── */
function SellCTA({ onSell }: { onSell: () => void }) {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-[#09B1BA]/10 via-[#09B1BA]/5 to-transparent rounded-2xl p-8 md:p-12 border border-[#09B1BA]/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Tem algo para vender?</h2>
              <p className="text-gray-500">
                Publica o teu anúncio gratuitamente e chega a milhares de compradores. 
                A plataforma cobra apenas 5% sobre cada venda concluída.
              </p>
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#09B1BA]" />
                  <span>Publicação em 2 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#09B1BA]" />
                  <span>Apenas 5% de comissão</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#09B1BA]" />
                  <span>Destaque disponível</span>
                </div>
              </div>
              <Button size="lg" className="gap-2 rounded-full bg-[#09B1BA] hover:bg-[#078E96] text-white border-0" onClick={onSell}>
                <Plus className="h-4 w-4" />
                Começar a Vender
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="hidden md:flex justify-center items-center" style={{ perspective: '1000px' }}>
              <div className="relative group">
                <div
                  className="absolute inset-0 rounded-2xl border border-[#09B1BA]/10 bg-gray-100/60"
                  style={{
                    transform: 'rotateY(-12deg) rotateX(6deg) translateZ(-40px) translateX(20px)',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)',
                  }}
                />
                <div
                  className="relative w-72 rounded-2xl border border-gray-200 bg-white p-5 space-y-4 transition-transform duration-500 group-hover:[transform:rotateY(-2deg)_rotateX(2deg)]"
                  style={{
                    transform: 'rotateY(-8deg) rotateX(5deg)',
                    boxShadow: '0 0 30px rgba(9,177,186,0.08), 0 20px 40px -15px rgba(0,0,0,0.1)',
                  }}
                >
                  <div className="h-32 rounded-lg overflow-hidden relative bg-gradient-to-br from-[#09B1BA]/10 via-gray-100 to-gray-50 flex items-center justify-center">
                    <Store className="h-10 w-10 text-[#09B1BA]/40" />
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-[#09B1BA] px-2 py-0.5">
                      <Star className="h-3 w-3 fill-white text-white" />
                      <span className="text-[10px] font-bold text-white">Em destaque</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 rounded w-3/4 bg-gray-200" />
                    <div className="h-3 rounded w-1/2 bg-gray-100" />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-bold text-[#09B1BA]">€ 149,00</span>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className="h-3 w-3 fill-[#09B1BA] text-[#09B1BA]" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Lives Section ───────────────────────────────────────────────── */
function LivesSection({
  lives,
  workspaceSlug,
  onNavigate,
}: {
  lives: PublicLivestream[];
  workspaceSlug: string;
  onNavigate: (id: string) => void;
}) {
  const livesNow = lives.filter((l) => l.status === "live");
  const scheduled = lives.filter((l) => l.status === "scheduled");
  const display = [...livesNow, ...scheduled].slice(0, 6);

  if (display.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <Radio className="h-5 w-5 text-red-500" />
          Lives
          {livesNow.length > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-[10px] px-1.5 animate-pulse">
              {livesNow.length} ao vivo
            </Badge>
          )}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#09B1BA] hover:text-[#078E96] gap-1 text-xs"
          onClick={() => onNavigate("__gallery__")}
        >
          Ver todas
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {display.map((live) => {
          const isLive = live.status === "live";
          return (
            <div
              key={live.id}
              onClick={() => onNavigate(live.id)}
              className="cursor-pointer group rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all bg-white"
            >
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
                {live.thumbnail_url ? (
                  <img
                    src={live.thumbnail_url}
                    alt={live.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                    <Radio className="h-10 w-10 text-red-300" />
                  </div>
                )}
                {isLive && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-red-600 text-white border-0 gap-1 text-[10px] px-2 py-0.5 font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
                      AO VIVO
                    </Badge>
                  </div>
                )}
                {live.status === "scheduled" && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5">
                      <Clock className="h-3 w-3" />
                      Agendada
                    </Badge>
                  </div>
                )}
                {isLive && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className="bg-black/60 text-white border-0 gap-1 text-[10px] backdrop-blur-sm">
                      <Eye className="h-3 w-3" />
                      {live.viewer_count}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 shrink-0">
                  {(live.seller_name || "V")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-gray-900">{live.title}</p>
                  <p className="text-xs text-gray-500">{live.seller_name || "Vendedor"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function C2CPublicMarketplace() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<C2CListingFilters>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [showListings, setShowListings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  usePublicMarketplaceTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
      setAuthUserId(session?.user?.id ?? null);
    });
  }, []);

  const { data: workspace, isLoading: wsLoading } = usePublicMarketplaceWorkspace(workspaceSlug);
  const workspaceId = workspace?.id;
  const { data: marketplaceConfig } = useMarketplaceConfig(workspaceSlug);
  const { data: storeSettings } = usePublicStoreSettings(workspaceId || "");
  const { data: listings = [], isLoading } = usePublicListings(workspaceId, filters);
  const { data: categories = [] } = usePublicCategories(workspaceId);
  const { data: sponsoredIds = [] } = useC2CSponsoredListings(workspaceId);
  const { data: publicLives = [] } = usePublicLivestreams(workspaceId);

  // Check if authenticated user is an approved seller in this workspace
  const { data: approvedSeller } = useQuery({
    queryKey: ["c2c-is-approved-seller-public", workspaceId, authUserId],
    enabled: !!workspaceId && !!authUserId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("c2c_sellers")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", authUserId!)
        .eq("status", "approved")
        .maybeSingle();
      return data as { id: string } | null;
    },
  });
  const isSeller = !!approvedSeller;

  const marketplaceName = marketplaceConfig?.name || storeSettings?.store_name || workspace?.name || "Marketplace";
  const ogTitle = `${marketplaceName} — Marketplace C2C`;
  const ogDescription = marketplaceConfig?.description || storeSettings?.store_description || `Explora o marketplace de ${marketplaceName}. Compra e vende entre utilizadores reais.`;
  const mktBase = getMarketplaceBaseUrlFromConfig(marketplaceConfig?.custom_domain);
  const ogImage = marketplaceConfig?.logo_url || storeSettings?.logo_url || `${mktBase}/og-image.png`;
  const ogUrl = `${mktBase}/marketplace/${workspaceSlug}`;
  const shareUrl = getShareUrl("store", workspaceSlug || "");

  const featuredListings = useMemo(() => listings.filter((l) => l.is_featured), [listings]);
  const recentListings = useMemo(() =>
    [...listings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12),
    [listings]
  );
  const trendingListings = useMemo(() =>
    [...listings].sort((a, b) => getTrendingScore(b) - getTrendingScore(a)).slice(0, 12),
    [listings]
  );
  const mostViewedListings = useMemo(() =>
    [...listings].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 12),
    [listings]
  );

  const hasActiveFilters = filters.search || filters.category || filters.condition || filters.minPrice || filters.maxPrice;
  const showBrowse = showListings || hasActiveFilters;

  const handleSell = () => {
    navigate(`/marketplace/${workspaceSlug}/sell`);
  };

  const handleExplore = () => {
    setShowListings(true);
    window.scrollTo({ top: 500, behavior: "smooth" });
  };

  if (wsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-center space-y-4">
          <Store className="h-12 w-12 mx-auto text-[#09B1BA]/30" />
          <p className="text-gray-400">A carregar marketplace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Store className="h-12 w-12 mx-auto text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-800">Marketplace não encontrado</h2>
          <p className="text-gray-400">O endereço que procuras não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 rounded-lg bg-[#09B1BA]/10">
                <Store className="w-5 h-5 text-[#09B1BA]" />
              </div>
              <h1 className="text-base sm:text-lg font-bold leading-tight text-gray-900">{marketplaceName}</h1>
            </div>

            <div className="order-3 w-full md:order-none md:flex-1 md:max-w-xl md:mx-auto">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-200 bg-gray-50 text-sm text-left text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#09B1BA]/30 transition-colors relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                {filters.search || "Pesquisar produtos, marcas, categorias..."}
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="hidden md:flex">
                <ShareButtons url={shareUrl} title={ogTitle} variant="dark" />
              </div>
              <Button variant="outline" size="sm" className="rounded-full hidden lg:flex border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900" onClick={() => navigate(isAuthenticated ? `/dashboard/c2c/seller-area?ws=${workspaceSlug}` : `/login?redirect=/marketplace/${workspaceSlug}`)}>
                {isAuthenticated ? 'Gerir' : 'Entrar'}
              </Button>
              {isSeller && (
                <Button size="sm" className="gap-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white border-0 animate-pulse" onClick={() => navigate(`/marketplace/${workspaceSlug}/go-live`)}>
                  <Radio className="h-3.5 w-3.5" />
                  Ao Vivo
                </Button>
              )}
              <Button size="sm" className="gap-1 rounded-full bg-[#09B1BA] hover:bg-[#078E96] text-white border-0" onClick={handleSell}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Vender</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      {!showBrowse && (
        <>
          <HeroSection onExplore={handleExplore} onSell={handleSell} />
          <HowItWorks />
        </>
      )}

      {/* Listings content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Seller Stories */}
        <SellerStories workspaceId={workspaceId} />

        {/* Lives section - visible to ALL visitors */}
        <LivesSection
          lives={publicLives}
          workspaceSlug={workspaceSlug || ""}
          onNavigate={(id) => {
            if (id === "__gallery__") {
              navigate(`/marketplace/${workspaceSlug}/lives`);
            } else {
              navigate(`/marketplace/${workspaceSlug}/live/${id}`);
            }
          }}
        />

        <div>
          <CategoryCarousel
            categories={categories}
            onSelect={(id) => {
              setFilters((f) => ({ ...f, category: id }));
              setShowListings(true);
            }}
            selected={filters.category}
          />
        </div>

        {hasActiveFilters ? (
          <div className="space-y-6">
            {isLoading ? (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                ))}
              </div>
            ) : listings.length > 0 ? (
              <>
                <p className="text-sm text-gray-400">
                  {listings.length} resultado{listings.length !== 1 ? "s" : ""}
                </p>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorite={false}
                      onToggleFavorite={() => {}}
                      onClick={() => navigate(`/marketplace/${workspaceSlug}/${listing.id}`)}
                      isSponsored={sponsoredIds.includes(listing.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2 text-gray-800">Nenhum resultado encontrado</h3>
                <p className="text-gray-400 mb-4">Tente ajustar os filtros</p>
                <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => setFilters({})}>Limpar filtros</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {featuredListings.length > 0 && (
              <SectionCarousel
                title="Destaques"
                icon={<Sparkles className="h-5 w-5 text-[#09B1BA]" />}
                listings={featuredListings}
                onNavigate={(id) => navigate(`/marketplace/${workspaceSlug}/${id}`)}
                sponsoredIds={sponsoredIds}
              />
            )}

            {trendingListings.length > 0 && (
              <SectionCarousel
                title="Em Alta 🔥"
                icon={<TrendingUp className="h-5 w-5 text-[#09B1BA]" />}
                listings={trendingListings}
                onNavigate={(id) => navigate(`/marketplace/${workspaceSlug}/${id}`)}
                sponsoredIds={sponsoredIds}
              />
            )}

            {mostViewedListings.length > 0 && mostViewedListings[0].views_count > 0 && (
              <SectionCarousel
                title="Mais Vistos"
                icon={<Eye className="h-5 w-5 text-[#09B1BA]" />}
                listings={mostViewedListings}
                onNavigate={(id) => navigate(`/marketplace/${workspaceSlug}/${id}`)}
                sponsoredIds={sponsoredIds}
              />
            )}

            {listings.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                  <Store className="h-5 w-5 text-[#09B1BA]" />
                  Todos os anúncios
                  <Badge className="text-xs bg-gray-100 text-gray-500 border-gray-200">{listings.length}</Badge>
                </h2>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {listings.slice(0, visibleCount).map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorite={false}
                      onToggleFavorite={() => {}}
                      onClick={() => navigate(`/marketplace/${workspaceSlug}/${listing.id}`)}
                      isSponsored={sponsoredIds.includes(listing.id)}
                    />
                  ))}
                </div>
                {visibleCount < listings.length && (
                  <div className="text-center pt-4">
                    <Button variant="outline" size="lg" className="rounded-full gap-2 border-gray-200 text-gray-600 hover:bg-gray-100" onClick={() => setVisibleCount((c) => c + 20)}>
                      Carregar mais ({listings.length - visibleCount} restantes)
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {!hasActiveFilters && <SellCTA onSell={handleSell} />}

        {/* Trust section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-gray-200">
          {[
            { icon: ShieldCheck, label: "Compra Segura", desc: "Transações protegidas" },
            { icon: Truck, label: "Envio Nacional", desc: "Para todo o país" },
            { icon: Award, label: "Vendedores Verificados", desc: "Perfis certificados" },
            { icon: MessageCircle, label: "Chat Direto", desc: "Fale com o vendedor" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2 p-4">
              <Icon className="h-8 w-8 text-[#09B1BA]" />
              <span className="text-sm font-medium text-gray-800">{label}</span>
              <span className="text-[11px] text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </main>

      <MarketplaceFooter workspaceName={marketplaceName} workspaceSlug={workspace.slug} />

      <MarketplaceSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={(q) => {
          setFilters((f) => ({ ...f, search: q }));
          setShowListings(true);
        }}
        initialQuery={filters.search || ""}
        workspaceId={workspaceId}
      />
    </div>
  );
}
