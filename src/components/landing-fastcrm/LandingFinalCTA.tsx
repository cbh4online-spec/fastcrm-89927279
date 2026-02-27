import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function LandingFinalCTA() {
  const { t } = useTranslation("landing");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/auth?email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="relative py-32 lg:py-40">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/8 blur-[180px]" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className="space-y-8">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            {t("finalCta.title")}
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-xl mx-auto">{t("finalCta.subtitle")}</p>
          
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto pt-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your work email"
              className="w-full sm:flex-1 h-14 px-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)] text-base focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto gradient-primary shadow-glow text-primary-foreground px-10 h-14 text-base font-bold uppercase tracking-wide gap-2"
            >
              {t("finalCta.cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
}
