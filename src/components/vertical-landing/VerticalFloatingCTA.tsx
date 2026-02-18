import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  config: VerticalConfig;
}

export function VerticalFloatingCTA({ config }: Props) {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Aparece após 300px de scroll
    setVisible(latest > 300);
  });

  const scrollToForm = () => {
    document.getElementById("vertical-cta-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: visible ? 0 : 100, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
    >
      {/* Fade gradient above */}
      <div className="h-6 bg-gradient-to-t from-[hsl(222,47%,4%)] to-transparent pointer-events-none" />

      <div className="bg-[hsl(222,47%,4%)]/95 backdrop-blur-xl border-t border-[hsl(217,33%,17%)] px-4 py-3">
        <Button
          onClick={scrollToForm}
          className="w-full gradient-primary shadow-glow text-primary-foreground h-12 text-sm font-semibold gap-2"
        >
          <span className="truncate">{config.cta_principal}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      </div>
    </motion.div>
  );
}
