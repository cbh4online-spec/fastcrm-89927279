import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * AIDA — AÇÃO (Action)
 * Banner final com urgência e CTA forte para converter o visitante.
 */
export function StoreCTABanner() {
  return (
    <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5" />
            Oferta por tempo limitado
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Não perca esta oportunidade
          </h2>

          <p className="text-primary-foreground/80 text-lg max-w-lg mx-auto">
            Explore o nosso catálogo e aproveite condições especiais. Compra 100% segura com entrega garantida.
          </p>

          <Button
            size="lg"
            variant="secondary"
            className="gap-2 font-semibold text-base px-10 shadow-lg hover:shadow-xl transition-all"
            onClick={() => {
              document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Comprar Agora
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
