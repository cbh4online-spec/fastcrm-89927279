import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Shield, Users } from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] } },
};

const cardItems = [
  { icon: Shield, key: "validatedAccess" },
  { icon: Users, key: "objectiveMatching" },
  { icon: Lock, key: "totalConfidentiality" },
];

export function LandingFastClubSection() {
  const { t } = useTranslation("landing");

  return (
    <section id="fastclub" className="relative py-28 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-center mb-14"
        >
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] px-4 py-1.5 text-xs font-medium text-[hsl(215,20%,75%)] tracking-wider uppercase mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Lock className="h-3 w-3" />
            {t("fastclub.badge")}
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            {t("fastclub.title")}{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              {t("fastclub.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
            {t("fastclub.subtitle")}
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-3 gap-4 mb-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
        >
          {cardItems.map((item) => (
            <motion.div
              key={item.key}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.03 }}
              className="group p-6 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] hover:border-primary/40 transition-all duration-300"
            >
              <motion.div
                className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <item.icon className="h-5 w-5 text-primary" />
              </motion.div>
              <h3 className="font-bold text-sm mb-1.5 uppercase tracking-wide">{t(`fastclub.${item.key}`)}</h3>
              <p className="text-xs text-[hsl(215,20%,65%)] leading-relaxed">{t(`fastclub.${item.key}Desc`)}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-center"
        >
          <Link to="/fastclub">
            <Button
              size="lg"
              className="gradient-primary shadow-glow text-primary-foreground px-10 h-14 text-base font-bold uppercase tracking-wide gap-2"
            >
              {t("fastclub.cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-[hsl(215,20%,55%)] mt-4">
            {t("fastclub.ctaNote")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
