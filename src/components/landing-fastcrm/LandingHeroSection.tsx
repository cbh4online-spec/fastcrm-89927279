import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import pricingBg from "@/assets/pricing-bg.jpg";

export function LandingHeroSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/auth?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(${pricingBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,4%)]/70 via-[hsl(222,47%,4%)]/50 to-[hsl(222,47%,4%)] pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary/8 blur-[180px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-10"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm font-semibold text-primary tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI Revenue Operating System
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.95] tracking-tight">
            <span className="block">See Your</span>
            <span className="block bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              Revenue
            </span>
            <span className="block">Before It Happens</span>
          </h1>

          <p className="text-lg sm:text-xl text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
            Health scores, deal intelligence, and smart automations — built into every object. Stop guessing. Start closing.
          </p>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto"
          >
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full sm:flex-1 h-14 px-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)] text-base focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
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
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.form>

          <p className="text-xs text-[hsl(215,20%,45%)]">
            Free forever for up to 2 users · No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
}
