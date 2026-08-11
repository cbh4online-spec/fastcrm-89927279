import { useState, useEffect } from "react";
import { usePublicMarketplaceTheme } from "@/hooks/c2c/usePublicMarketplaceTheme";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMySellerProfile, useRegisterSeller } from "@/hooks/useC2CSellers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, ArrowLeft, ArrowRight, CheckCircle2, Clock, XCircle, User, Phone, MapPin,
  CreditCard, Building2, FileText, Sparkles, ShieldCheck, DollarSign, Zap,
  Package, Heart, Shirt, Gamepad2, BookOpen, Baby, Home, Dumbbell, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

function useWorkspaceBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["c2c-ws-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("public_workspaces")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

/* ── Quiz categories ─────────────────────────────────────── */
const SELL_CATEGORIES = [
  { id: "fashion", icon: Shirt, label: "Moda & Acessórios" },
  { id: "electronics", icon: Gamepad2, label: "Eletrónica & Gaming" },
  { id: "books", icon: BookOpen, label: "Livros & Media" },
  { id: "kids", icon: Baby, label: "Bebé & Criança" },
  { id: "home", icon: Home, label: "Casa & Decoração" },
  { id: "sports", icon: Dumbbell, label: "Desporto & Lazer" },
  { id: "collectibles", icon: Sparkles, label: "Colecionáveis" },
  { id: "other", icon: Package, label: "Outros" },
];

const SELL_MOTIVATIONS = [
  { id: "declutter", label: "Desapegar de coisas que já não uso", emoji: "🧹" },
  { id: "extra_income", label: "Ganhar um rendimento extra", emoji: "💰" },
  { id: "sustainability", label: "Dar nova vida a objetos", emoji: "♻️" },
  { id: "hobby", label: "Vender por hobby", emoji: "🎨" },
];

const TOTAL_STEPS = 5;

/* ── Step indicator ──────────────────────────────────────── */
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full max-w-xs mx-auto">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full flex-1 transition-all duration-500",
            i < current ? "bg-[#09B1BA]" : i === current ? "bg-[#09B1BA]/40" : "bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

/* ── Animated step wrapper ───────────────────────────────── */
function StepWrapper({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function C2CSellerRegistration() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: workspace } = useWorkspaceBySlug(workspaceSlug);
  const workspaceId = workspace?.id;

  usePublicMarketplaceTheme();

  const { data: sellerProfile, isLoading: profileLoading } = useMySellerProfile(workspaceId);
  const registerSeller = useRegisterSeller(workspaceId);

  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [motivation, setMotivation] = useState("");
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    phone: "",
    location: "",
    iban: "",
    bank_name: "",
    account_holder: "",
    nif: "",
  });

  useEffect(() => {
    if (sellerProfile?.status === "approved") {
      navigate(`/marketplace/${workspaceSlug}`, { replace: true });
    }
  }, [sellerProfile, workspaceSlug, navigate]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!form.display_name.trim()) return;
    registerSeller.mutate({
      ...form,
      bio: form.bio || `${motivation ? SELL_MOTIVATIONS.find(m => m.id === motivation)?.label + ". " : ""}${selectedCategories.length ? "Categorias: " + selectedCategories.map(c => SELL_CATEGORIES.find(sc => sc.id === c)?.label).filter(Boolean).join(", ") : ""}`,
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return true; // welcome
      case 1: return selectedCategories.length > 0;
      case 2: return !!motivation;
      case 3: return !!form.display_name.trim() && !!form.location.trim();
      case 4: return true; // bank is optional
      default: return true;
    }
  };

  const goBack = () => navigate(`/marketplace/${workspaceSlug}`);

  /* ── Not logged in ─────────────────────────────────────── */
  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Store className="h-5 w-5 text-[#09B1BA]" />
            <h1 className="font-bold text-gray-900">Tornar-se Vendedor</h1>
          </div>
        </header>
        <div className="max-w-sm mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-[#09B1BA]/10 flex items-center justify-center mx-auto mb-6">
            <Store className="h-10 w-10 text-[#09B1BA]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Começa a vender hoje</h2>
          <p className="text-gray-500 mb-8">
            Junta-te à comunidade de vendedores. Cria uma conta ou faz login para começar.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-[#09B1BA] hover:bg-[#078E96] text-white h-12 text-base"
              onClick={() => navigate(`/signup?redirect=/marketplace/${workspaceSlug}/sell`)}
            >
              Criar Conta
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => navigate(`/login?redirect=/marketplace/${workspaceSlug}/sell`)}
            >
              Já tenho conta — Entrar
            </Button>
          </div>
          {/* Trust signals */}
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-gray-400">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Seguro</span>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Rápido</span>
            <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> 5% comissão</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Status pages ──────────────────────────────────────── */
  if (sellerProfile) {
    if (sellerProfile.status === "approved") {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse text-gray-400">A redirecionar...</div>
        </div>
      );
    }

    const statusConfig = {
      pending: { icon: Clock, color: "text-[#09B1BA]", bg: "bg-[#09B1BA]/10", label: "Em Análise", desc: "A tua candidatura está a ser analisada. Receberás uma notificação em breve!" },
      rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Não Aprovado", desc: sellerProfile.rejection_reason || "Infelizmente a candidatura não foi aprovada." },
      suspended: { icon: XCircle, color: "text-orange-500", bg: "bg-orange-50", label: "Suspenso", desc: "A tua conta está temporariamente suspensa." },
    } as const;
    const s = statusConfig[sellerProfile.status as keyof typeof statusConfig];
    if (!s) return null;
    const StatusIcon = s.icon;

    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Store className="h-5 w-5 text-[#09B1BA]" />
            <h1 className="font-bold text-gray-900">Estado da Candidatura</h1>
          </div>
        </header>
        <div className="max-w-sm mx-auto px-4 py-16 text-center">
          <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6", s.bg)}>
            <StatusIcon className={cn("h-10 w-10", s.color)} />
          </div>
          <Badge variant="outline" className={cn("mb-4", s.color)}>{s.label}</Badge>
          <p className="text-gray-500">{s.desc}</p>
          <Button variant="outline" className="mt-8" onClick={goBack}>
            Voltar ao Marketplace
          </Button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">A carregar...</div>
      </div>
    );
  }

  /* ── Quiz / Registration Flow ──────────────────────────── */
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:bg-gray-100"
            onClick={() => (step > 0 ? setStep(step - 1) : goBack())}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <StepProgress current={step} total={TOTAL_STEPS} />
          </div>
          <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
            {step + 1}/{TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <StepWrapper stepKey="welcome">
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-[#09B1BA]/10 flex items-center justify-center mx-auto"
              >
                <Store className="h-12 w-12 text-[#09B1BA]" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Vamos começar! 🎉</h2>
                <p className="text-gray-500">
                  Em menos de 2 minutos vais estar pronto para vender. Vamos fazer-te algumas perguntas rápidas.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                {[
                  { icon: Zap, label: "Publicação rápida", desc: "Lista em segundos" },
                  { icon: DollarSign, label: "Apenas 5%", desc: "Comissão justa" },
                  { icon: ShieldCheck, label: "Pagamento seguro", desc: "Protegido" },
                  { icon: Heart, label: "Comunidade", desc: "Compradores ativos" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                    <Icon className="h-6 w-6 text-[#09B1BA] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </StepWrapper>
        )}

        {/* Step 1: What do you sell? */}
        {step === 1 && (
          <StepWrapper stepKey="categories">
            <div className="space-y-6 w-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">O que vais vender? 🛍️</h2>
                <p className="text-gray-500">Seleciona uma ou mais categorias</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SELL_CATEGORIES.map(({ id, icon: Icon, label }) => {
                  const selected = selectedCategories.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCategory(id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200 text-center",
                        selected
                          ? "border-[#09B1BA] bg-[#09B1BA]/5 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2"
                        >
                          <Check className="h-4 w-4 text-[#09B1BA]" />
                        </motion.div>
                      )}
                      <Icon className={cn("h-7 w-7", selected ? "text-[#09B1BA]" : "text-gray-400")} />
                      <span className={cn("text-sm font-medium", selected ? "text-[#09B1BA]" : "text-gray-700")}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </StepWrapper>
        )}

        {/* Step 2: Why sell? */}
        {step === 2 && (
          <StepWrapper stepKey="motivation">
            <div className="space-y-6 w-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Porquê vender? 💡</h2>
                <p className="text-gray-500">Ajuda-nos a personalizar a tua experiência</p>
              </div>
              <div className="space-y-3">
                {SELL_MOTIVATIONS.map(({ id, label, emoji }) => {
                  const selected = motivation === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMotivation(id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                        selected
                          ? "border-[#09B1BA] bg-[#09B1BA]/5"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className={cn("text-sm font-medium flex-1", selected ? "text-[#09B1BA]" : "text-gray-700")}>
                        {label}
                      </span>
                      {selected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="h-5 w-5 text-[#09B1BA]" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </StepWrapper>
        )}

        {/* Step 3: Personal info */}
        {step === 3 && (
          <StepWrapper stepKey="personal">
            <div className="space-y-6 w-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">O teu perfil 👤</h2>
                <p className="text-gray-500">Como os compradores te vão conhecer</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-gray-700 font-medium">
                    Nome de vendedor *
                  </Label>
                  <Input
                    id="display_name"
                    value={form.display_name}
                    onChange={(e) => updateField("display_name", e.target.value)}
                    placeholder="Como queres ser conhecido?"
                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-700 font-medium flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-gray-400" /> Localização *
                  </Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Ex: Lisboa, Porto, Braga..."
                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-gray-400" /> Telefone
                    <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+351 9XX XXX XXX"
                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-gray-700 font-medium">
                    Sobre ti <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Conta um pouco sobre ti e o que vendes..."
                    rows={3}
                    className="rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20"
                  />
                </div>
              </div>
            </div>
          </StepWrapper>
        )}

        {/* Step 4: Bank + Fiscal (optional) */}
        {step === 4 && (
          <StepWrapper stepKey="bank">
            <div className="space-y-6 w-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Receber pagamentos 💳</h2>
                <p className="text-gray-500">
                  Podes preencher agora ou depois. Necessário para receber os teus ganhos.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="iban" className="text-gray-700 font-medium">IBAN</Label>
                  <Input
                    id="iban"
                    value={form.iban}
                    onChange={(e) => updateField("iban", e.target.value)}
                    placeholder="PT50 0000 0000 0000 0000 0000 0"
                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20 font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name" className="text-gray-700 font-medium flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-400" /> Banco
                    </Label>
                    <Input
                      id="bank_name"
                      value={form.bank_name}
                      onChange={(e) => updateField("bank_name", e.target.value)}
                      placeholder="Ex: CGD"
                      className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_holder" className="text-gray-700 font-medium">Titular</Label>
                    <Input
                      id="account_holder"
                      value={form.account_holder}
                      onChange={(e) => updateField("account_holder", e.target.value)}
                      placeholder="Nome completo"
                      className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nif" className="text-gray-700 font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-gray-400" /> NIF
                    <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="nif"
                    value={form.nif}
                    onChange={(e) => updateField("nif", e.target.value)}
                    placeholder="Número de contribuinte"
                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#09B1BA] focus:ring-[#09B1BA]/20"
                  />
                </div>
              </div>
              {/* Trust signal */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#09B1BA]/5 border border-[#09B1BA]/10">
                <ShieldCheck className="h-5 w-5 text-[#09B1BA] shrink-0" />
                <p className="text-xs text-gray-600">
                  Os teus dados bancários estão encriptados e nunca são partilhados com terceiros.
                </p>
              </div>
            </div>
          </StepWrapper>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-200 bg-white sticky bottom-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4 flex gap-3">
          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex-1 h-12 text-base bg-[#09B1BA] hover:bg-[#078E96] text-white rounded-xl gap-2 disabled:opacity-40"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={registerSeller.isPending || !form.display_name.trim()}
              className="flex-1 h-12 text-base bg-[#09B1BA] hover:bg-[#078E96] text-white rounded-xl gap-2 disabled:opacity-40"
            >
              {registerSeller.isPending ? (
                "A submeter..."
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Submeter Candidatura
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
