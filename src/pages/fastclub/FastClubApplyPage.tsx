import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SECTORS = [
  "Tecnologia",
  "Saude",
  "Financas e Seguros",
  "Imobiliario",
  "Industria e Manufactura",
  "Retalho e Distribuicao",
  "Consultoria e Servicos",
  "Educacao",
  "Energia e Ambiente",
  "Construcao",
  "Turismo e Hotelaria",
  "Alimentar e Agro",
  "Logistica e Transportes",
  "Media e Comunicacao",
  "Outro",
];

const REVENUE_RANGES = [
  "Ate 100K EUR",
  "100K - 250K EUR",
  "250K - 500K EUR",
  "500K - 1M EUR",
  "1M - 5M EUR",
  "5M - 10M EUR",
  "Acima de 10M EUR",
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

// FastClub Apply Page - v2
export default function FastClubApplyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sector, setSector] = useState("");
  const [revenue, setRevenue] = useState("");
  const canonicalUrl = `${getPublicBaseUrl()}/club/fastclub/apply`;
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!consent) {
      toast({
        title: "Consentimento obrigatorio",
        description: "Por favor confirme que compreende os termos de admissao.",
        variant: "destructive",
      });
      return;
    }

    if (!sector) {
      toast({
        title: "Campo obrigatorio",
        description: "Por favor selecione o setor de atividade.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    try {
      const applicationData = {
        full_name: (fd.get("full_name") as string).trim(),
        email: (fd.get("email") as string).trim().toLowerCase(),
        phone: (fd.get("phone") as string)?.trim() || null,
        company: (fd.get("company_name") as string).trim(),
        role: (fd.get("job_title") as string).trim(),
        job_title: (fd.get("job_title") as string).trim(),
        sector,
        employees: (fd.get("employees_count") as string) || null,
        employees_count: parseInt(fd.get("employees_count") as string) || null,
        revenue,
        estimated_annual_revenue: revenue,
        website_linkedin: (fd.get("website_or_linkedin") as string)?.trim() || null,
        motivation: (fd.get("strategic_objective") as string).trim(),
        strategic_objective: (fd.get("strategic_objective") as string).trim(),
        contribution: (fd.get("contribution") as string)?.trim() || null,
        consent_given: true,
        status: "pending",
      };

      const { data, error } = await supabase
        .from("fastclub_applications" as any)
        .insert(applicationData)
        .select("id")
        .single();

      if (error) throw error;

      // Trigger processing edge function
      const applicationId = (data as any)?.id;
      if (applicationId) {
        supabase.functions.invoke("fastclub-application-processor", {
          body: { applicationId },
        }).catch((err) => {
          console.error("Background processing error:", err);
        });
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("FastClub application error:", err);
      toast({
        title: "Erro ao submeter candidatura",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,4%)] text-[hsl(210,40%,98%)] flex items-center justify-center p-6">
        <Helmet>
          <title>Candidatura Submetida - FastClub</title>
        </Helmet>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 max-w-lg"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Candidatura Recebida
          </h1>
          <p className="text-lg text-[hsl(215,20%,65%)] leading-relaxed">
            O seu perfil sera analisado com confidencialidade pela nossa equipa.
            Resposta prevista em ate 5 dias uteis.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-[hsl(215,20%,55%)]">
            <Shield className="h-4 w-4" />
            <span>Analise confidencial e estrategica</span>
          </div>
          <div className="pt-4">
            <Link to="/fastclub">
              <Button variant="outline" className="border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] hover:bg-[hsl(222,47%,8%)] gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao FastClub
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(222,47%,4%)] text-[hsl(210,40%,98%)]">
      <Helmet>
        <title>Candidatura - FastClub Private Capital Circle</title>
        <meta
          name="description"
          content="Submeta a sua candidatura ao FastClub Private Capital Circle. Acesso sujeito a validacao estrategica."
        />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      {/* Header */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[hsl(222,47%,4%)]/95 backdrop-blur-md border-b border-[hsl(217,33%,17%)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/fastclub" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">FastClub</span>
          </Link>
          <Link to="/fastclub">
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(215,20%,75%)] hover:text-[hsl(210,40%,98%)] gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-28 pb-20">
        <div className="max-w-2xl mx-auto px-6">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 space-y-4"
          >
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Solicitar Avaliacao de{" "}
              <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                Entrada
              </span>
            </h1>
            <p className="text-[hsl(215,20%,65%)] max-w-lg mx-auto">
              Preencha o formulario com rigor. Cada campo contribui para a
              avaliacao estrategica do seu perfil.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal info */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-[hsl(210,40%,98%)] uppercase tracking-wider">
                      Dados Pessoais
                    </h3>
                    <div className="h-px bg-[hsl(217,33%,17%)]" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        Nome Completo *
                      </Label>
                      <Input
                        name="full_name"
                        required
                        maxLength={100}
                        placeholder="Nome completo"
                        className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        Email *
                      </Label>
                      <Input
                        name="email"
                        type="email"
                        required
                        maxLength={255}
                        placeholder="email@empresa.com"
                        className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        Telefone
                      </Label>
                      <Input
                        name="phone"
                        type="tel"
                        maxLength={20}
                        placeholder="+351 900 000 000"
                        className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        Cargo *
                      </Label>
                      <Input
                        name="job_title"
                        required
                        maxLength={100}
                        placeholder="CEO, Director, Fundador..."
                        className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]"
                      />
                    </div>
                  </div>

                  {/* Company info */}
                  <div className="space-y-1.5 pt-4">
                    <h3 className="text-sm font-semibold text-[hsl(210,40%,98%)] uppercase tracking-wider">
                      Dados Empresariais
                    </h3>
                    <div className="h-px bg-[hsl(217,33%,17%)]" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        Empresa *
                      </Label>
                      <Input
                        name="company_name"
                        required
                        maxLength={150}
                        placeholder="Nome da empresa"
                        className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        Setor *
                      </Label>
                      <Select value={sector} onValueChange={setSector} required>
                        <SelectTrigger className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)]">
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTORS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        N. Colaboradores *
                      </Label>
                      <Input
                        name="employees_count"
                        type="number"
                        required
                        min={1}
                        max={100000}
                        placeholder="Ex: 15"
                        className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">
                        Faturacao Anual Estimada *
                      </Label>
                      <Select value={revenue} onValueChange={setRevenue} required>
                        <SelectTrigger className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)]">
                          <SelectValue placeholder="Selecione o intervalo" />
                        </SelectTrigger>
                        <SelectContent>
                          {REVENUE_RANGES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)] text-xs">
                      Website / LinkedIn
                    </Label>
                    <Input
                      name="website_or_linkedin"
                      maxLength={500}
                      placeholder="https://"
                      className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]"
                    />
                  </div>

                  {/* Strategic info */}
                  <div className="space-y-1.5 pt-4">
                    <h3 className="text-sm font-semibold text-[hsl(210,40%,98%)] uppercase tracking-wider">
                      Posicionamento Estrategico
                    </h3>
                    <div className="h-px bg-[hsl(217,33%,17%)]" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)] text-xs">
                      Qual o seu objetivo estrategico ao integrar o Private Capital Circle? *
                    </Label>
                    <Textarea
                      name="strategic_objective"
                      required
                      rows={4}
                      maxLength={2000}
                      placeholder="Descreva os seus objetivos, motivacoes e expectativas."
                      className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[hsl(210,40%,98%)] text-xs">
                      O que pode contribuir para o circulo?
                    </Label>
                    <Textarea
                      name="contribution"
                      rows={3}
                      maxLength={2000}
                      placeholder="Descreva o valor que pode aportar ao grupo."
                      className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)] resize-none"
                    />
                  </div>

                  {/* Consent */}
                  <div className="flex items-start gap-3 pt-2">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                      className="mt-0.5 border-[hsl(217,33%,17%)] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label
                      htmlFor="consent"
                      className="text-xs text-[hsl(215,20%,65%)] leading-relaxed cursor-pointer"
                    >
                      Confirmo que compreendo que o acesso ao FastClub Private
                      Capital Circle e sujeito a validacao estrategica e que os
                      dados fornecidos serao tratados com confidencialidade.
                    </label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || !consent}
                    className="w-full gradient-primary shadow-glow text-primary-foreground h-12 text-base font-semibold gap-2"
                  >
                    {isSubmitting ? "A submeter..." : "Solicitar Avaliacao"}
                    {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                  </Button>

                  <p className="text-xs text-center text-[hsl(215,20%,55%)]">
                    Analise confidencial. Resposta em ate 5 dias uteis.
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-[hsl(217,33%,17%)]">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-[hsl(215,20%,55%)]">
          <div className="flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" />
            <span className="font-semibold text-[hsl(210,40%,98%)]">FastClub</span>
            <span className="text-[hsl(215,20%,35%)]">|</span>
            <span>Private Capital Circle</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
