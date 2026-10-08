import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * AIDA — AÇÃO (Action)
 * Banner final com CTA. Sem urgência artificial: só se mostram promoções
 * quando existe desconto e prazo reais configurados.
 */
export function StoreCTABanner() {
  return (
    <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-2xl mx-auto text-center space-y-5">

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Encontre o equipamento certo
          </h2>

          <p className="text-primary-foreground/80 text-lg max-w-lg mx-auto">
            Veja o catálogo completo, com preços e disponibilidade atualizados.
          </p>

          <Button
            size="lg"
            variant="secondary"
            className="gap-2 font-semibold text-base px-10 shadow-lg hover:shadow-xl transition-all"
            onClick={() => {
              document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Ver catálogo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
