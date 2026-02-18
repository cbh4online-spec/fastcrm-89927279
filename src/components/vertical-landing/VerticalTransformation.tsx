import { motion } from "framer-motion";
import { XCircle, CheckCircle2 } from "lucide-react";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  config: VerticalConfig;
}

export function VerticalTransformation({ config }: Props) {
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
            A transformação que o FastCRM traz
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* ANTES */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-[hsl(0,30%,20%)] bg-[hsl(0,15%,7%)] p-8"
          >
            <h3 className="text-lg font-bold text-[hsl(0,84%,60%)] mb-6">ANTES</h3>
            <ul className="space-y-4">
              {config.antes_depois.antes.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-[hsl(0,84%,60%)] shrink-0 mt-0.5" />
                  <span className="text-[hsl(215,20%,75%)]">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* DEPOIS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-8"
          >
            <h3 className="text-lg font-bold text-primary mb-6">DEPOIS</h3>
            <ul className="space-y-4">
              {config.antes_depois.depois.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-[hsl(210,40%,90%)]">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
