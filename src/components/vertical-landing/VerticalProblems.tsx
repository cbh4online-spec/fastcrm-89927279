import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  config: VerticalConfig;
}

export function VerticalProblems({ config }: Props) {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Reconhece estes{" "}
            <span className="text-[hsl(0,84%,60%)]">problemas</span>?
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            A maioria dos {config.nome.toLowerCase()} enfrenta estes desafios diariamente — e perde dinheiro por isso.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {config.dores.map((dor, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex gap-4 p-6 rounded-xl border border-[hsl(0,30%,20%)] bg-[hsl(0,20%,8%)] hover:border-[hsl(0,40%,30%)] transition-colors"
            >
              <XCircle className="h-6 w-6 text-[hsl(0,84%,60%)] shrink-0 mt-0.5" />
              <p className="text-[hsl(210,40%,90%)] leading-relaxed">{dor}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12 text-[hsl(215,20%,65%)] text-lg"
        >
          Cada dia sem sistema custa-lhe clientes, tempo e receita. <span className="text-[hsl(210,40%,98%)] font-semibold">Existe uma solução.</span>
        </motion.p>
      </div>
    </section>
  );
}
