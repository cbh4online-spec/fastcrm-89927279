import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  config: VerticalConfig;
}

export function VerticalROI({ config }: Props) {
  const [clientesExtra, setClientesExtra] = useState(config.roi_exemplo.clientes_extra);
  const [valorMedio, setValorMedio] = useState(config.roi_exemplo.valor_medio);

  const impactoMensal = clientesExtra * valorMedio;
  const impactoAnual = impactoMensal * 12;

  return (
    <section className="relative py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simule o <span className="text-primary">impacto</span> no seu negócio
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)]">
            Ajuste os valores e veja o retorno estimado do FastCRM para {config.nome.toLowerCase()}.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-8 lg:p-10"
        >
          <div className="grid sm:grid-cols-2 gap-8 mb-10">
            <div>
              <label className="block text-sm font-medium text-[hsl(215,20%,75%)] mb-2">
                Clientes extra por {config.roi_exemplo.periodo}
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={clientesExtra}
                onChange={(e) => setClientesExtra(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-2xl font-bold mt-2">+{clientesExtra}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[hsl(215,20%,75%)] mb-2">
                Valor médio por cliente (€)
              </label>
              <input
                type="range"
                min={50}
                max={10000}
                step={50}
                value={valorMedio}
                onChange={(e) => setValorMedio(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-2xl font-bold mt-2">€{valorMedio.toLocaleString("pt-PT")}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-sm text-[hsl(215,20%,65%)] mb-1">Impacto Mensal</div>
              <div className="text-3xl font-bold text-primary">€{impactoMensal.toLocaleString("pt-PT")}</div>
            </div>
            <div className="rounded-xl border border-[hsl(250,83%,60%)]/20 bg-[hsl(250,83%,60%)]/5 p-6 text-center">
              <TrendingUp className="h-6 w-6 text-[hsl(250,83%,60%)] mx-auto mb-2" />
              <div className="text-sm text-[hsl(215,20%,65%)] mb-1">Impacto Anual</div>
              <div className="text-3xl font-bold text-[hsl(250,83%,60%)]">€{impactoAnual.toLocaleString("pt-PT")}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
