import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { VerticalConfig } from "@/config/verticalConfigs";

const formSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(100),
  company: z.string().trim().min(2, "Empresa obrigatória").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(9, "Telefone obrigatório").max(20),
  team_size: z.string().min(1, "Selecione o tamanho da equipa"),
  main_challenge: z.string().trim().min(10, "Descreva o principal desafio").max(1000),
  monthly_revenue: z.string().min(1, "Selecione a faturação"),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  config: VerticalConfig;
}

const teamSizeOptions = [
  "1-5 pessoas",
  "6-15 pessoas",
  "16-50 pessoas",
  "51-100 pessoas",
  "100+ pessoas",
];

const revenueOptions = [
  "< €10.000/mês",
  "€10.000 - €50.000/mês",
  "€50.000 - €200.000/mês",
  "€200.000 - €500.000/mês",
  "> €500.000/mês",
];

export function VerticalCTAForm({ config }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("vertical-landing-submit", {
        body: { vertical: config.slug, ...data },
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="vertical-cta-form" className="relative py-24 lg:py-32">
        <div className="max-w-2xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-12 text-center"
          >
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-3">Formulário enviado com sucesso!</h3>
            <p className="text-[hsl(215,20%,65%)] text-lg">
              A nossa equipa vai analisar o seu caso e entrar em contacto nas próximas 24 horas com um plano personalizado para {config.nome.toLowerCase()}.
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="vertical-cta-form" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Pronto para modernizar?
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)]">
            Preencha o formulário e receba um diagnóstico personalizado.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-8 space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[hsl(215,20%,75%)]">Nome</Label>
              <Input {...register("name")} placeholder="O seu nome" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)]" />
              {errors.name && <p className="text-xs text-[hsl(0,84%,60%)]">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[hsl(215,20%,75%)]">Empresa</Label>
              <Input {...register("company")} placeholder="Nome da empresa" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)]" />
              {errors.company && <p className="text-xs text-[hsl(0,84%,60%)]">{errors.company.message}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[hsl(215,20%,75%)]">Email</Label>
              <Input {...register("email")} type="email" placeholder="email@empresa.pt" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)]" />
              {errors.email && <p className="text-xs text-[hsl(0,84%,60%)]">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[hsl(215,20%,75%)]">Telefone</Label>
              <Input {...register("phone")} placeholder="+351 912 345 678" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)]" />
              {errors.phone && <p className="text-xs text-[hsl(0,84%,60%)]">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[hsl(215,20%,75%)]">Tamanho da equipa</Label>
              <select {...register("team_size")} className="flex h-10 w-full rounded-md border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)] text-[hsl(210,40%,98%)] px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {teamSizeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.team_size && <p className="text-xs text-[hsl(0,84%,60%)]">{errors.team_size.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[hsl(215,20%,75%)]">Faturação mensal estimada</Label>
              <select {...register("monthly_revenue")} className="flex h-10 w-full rounded-md border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)] text-[hsl(210,40%,98%)] px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {revenueOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.monthly_revenue && <p className="text-xs text-[hsl(0,84%,60%)]">{errors.monthly_revenue.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[hsl(215,20%,75%)]">Principal desafio</Label>
            <Textarea {...register("main_challenge")} placeholder="Descreva o principal desafio que enfrenta na gestão do seu negócio..." rows={4} className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)]" />
            {errors.main_challenge && <p className="text-xs text-[hsl(0,84%,60%)]">{errors.main_challenge.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full gradient-primary shadow-glow text-primary-foreground h-12 text-base font-semibold gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> A enviar...</>
            ) : (
              <>Quero Modernizar a Minha {config.nome} <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </motion.form>
      </div>
    </section>
  );
}
