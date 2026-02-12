import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare } from "lucide-react";

export function LandingFinalCTA() {
  return (
    <section className="relative py-28 lg:py-36">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[150px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Pronto para centralizar a sua operação?
          </h2>

          <p className="text-lg text-[hsl(215,20%,65%)] max-w-xl mx-auto">
            Comece gratuitamente. Sem cartão de crédito. Configure o seu workspace em menos de 2 minutos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link to="/auth">
              <Button
                size="lg"
                className="gradient-primary shadow-glow text-primary-foreground px-10 h-14 text-base font-semibold gap-2"
              >
                Criar Workspace Agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="border-[hsl(217,33%,17%)] bg-transparent text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] px-8 h-14 text-base gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Falar com Especialista
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
