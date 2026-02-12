import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";

export function LandingPositioningSection() {
  return (
    <section className="relative py-28 lg:py-36">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="space-y-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Target className="h-8 w-8 text-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Não é para todos.
          </h2>

          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
            O FastCRM é para empresas que querem estrutura, escala e inteligência operacional.
            Não é para quem quer apenas guardar contactos.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 pt-4">
            {[
              { title: "Clínicas & Saúde", desc: "Grupos com múltiplas unidades e equipas comerciais" },
              { title: "Agências", desc: "Gestão multi-workspace para clientes em escala" },
              { title: "Empresas B2B", desc: "Operações complexas com foco em conversão e automação" },
            ].map((segment) => (
              <div
                key={segment.title}
                className="rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-5 text-left"
              >
                <h3 className="font-semibold mb-1.5 text-sm">{segment.title}</h3>
                <p className="text-xs text-[hsl(215,20%,65%)] leading-relaxed">{segment.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
