import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Play, Briefcase, TrendingUp,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const subchannels = [
  {
    title: "Demonstrações",
    description: "Vídeos e demos interativos das funcionalidades do FastCRM.",
    icon: Play,
    href: "/club/fastclub/demos/demonstracoes",
    color: "from-blue-600 to-blue-400",
  },
  {
    title: "Casos Práticos",
    description: "Resultados reais de empresas que utilizam o FastCRM.",
    icon: Briefcase,
    href: "/club/fastclub/demos/casos-praticos",
    color: "from-emerald-500 to-green-400",
  },
  {
    title: "Roadmap e Atualizações",
    description: "Evolução contínua do ecossistema FastCRM.",
    icon: TrendingUp,
    href: "/club/fastclub/demos/roadmap",
    color: "from-violet-500 to-purple-400",
  },
];

export default function DemosPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative container mx-auto px-4 pt-6 pb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/club/fastclub")}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">
              Zona Pública
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              FastCRM em Ação
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Demonstrações, casos práticos e roadmap do ecossistema FastCRM.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {subchannels.map((sub, i) => (
          <motion.div key={sub.title} {...stagger} transition={{ delay: 0.1 + i * 0.1 }}>
            <Card
              className="border-border/50 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(sub.href)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className={`bg-gradient-to-br ${sub.color} p-6 md:p-8 md:w-48 flex flex-col items-center justify-center text-white shrink-0`}>
                    <sub.icon className="w-10 h-10" />
                  </div>
                  <div className="p-6 flex-1 space-y-2">
                    <h3 className="text-lg font-bold text-foreground">{sub.title}</h3>
                    <p className="text-sm text-muted-foreground">{sub.description}</p>
                    <div className="flex items-center gap-2 text-xs text-primary font-medium pt-1">
                      Explorar <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
