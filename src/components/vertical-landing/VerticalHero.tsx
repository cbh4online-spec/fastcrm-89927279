import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerticalConfig } from "@/config/verticalConfigs";
import { DashboardMockup } from "./DashboardMockup";

interface Props {
  config: VerticalConfig;
}

export function VerticalHero({ config }: Props) {
  const scrollToForm = () => {
    document.getElementById("vertical-cta-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: `${config.cores.primaria.replace(")", "/0.12)")}` }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[hsl(250,83%,60%)]/10 blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary px-4 py-1.5 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-2 inline-block" />
            Solução especializada para {config.nome}
          </Badge>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight">
            O Sistema Operacional com IA para{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              {config.nome}
            </span>{" "}
            que querem {config.resultado_prometido}
          </h1>

          <p className="text-lg lg:text-xl text-[hsl(215,20%,65%)] max-w-3xl mx-auto leading-relaxed">
            Elimine processos manuais, automatize operações e aumente resultados com um CRM criado especificamente para {config.nome}.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={scrollToForm}
              className="gradient-primary shadow-glow text-primary-foreground px-8 h-12 text-base font-semibold gap-2"
            >
              {config.cta_principal}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToForm}
              className="border-[hsl(217,33%,17%)] bg-transparent text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] px-8 h-12 text-base gap-2"
            >
              <Play className="h-4 w-4" />
              {config.cta_secundario}
            </Button>
          </div>
        </motion.div>

        {/* Dashboard mockup image */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="mt-16 lg:mt-24 max-w-5xl mx-auto"
        >
          <div className="relative rounded-xl overflow-hidden border border-[hsl(217,33%,17%)] shadow-2xl shadow-primary/10"
            style={{ perspective: "1200px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,4%)] via-transparent to-transparent z-10 pointer-events-none" />
            <DashboardMockup config={config} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
