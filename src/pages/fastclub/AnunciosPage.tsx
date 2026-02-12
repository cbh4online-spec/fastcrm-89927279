import { motion } from "framer-motion";
import { ArrowLeft, Megaphone, AlertCircle, Info, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "novo" | "importante" | "atualizacao";
  date: string;
}

const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "Bem-vindos ao FastClub",
    content: "A comunidade oficial do ecossistema FastCRM está ativa. Explore os conteúdos, participe nas discussões e comece a construir relações estratégicas.",
    type: "novo",
    date: "2026-02-12",
  },
  {
    id: "2",
    title: "FastMatch — Motor de Conexões",
    content: "O FastMatch já está disponível no CRM. Descubra perfis estratégicos, demonstre interesse e desbloqueie conexões de valor.",
    type: "importante",
    date: "2026-02-12",
  },
  {
    id: "3",
    title: "Programa Fundadores",
    content: "Os primeiros 50 membros têm acesso ao estatuto de Membro Fundador com quotas especiais durante 3 meses.",
    type: "atualizacao",
    date: "2026-02-12",
  },
];

const TYPE_CONFIG = {
  novo: { label: "Novo", variant: "default" as const, icon: Star },
  importante: { label: "Importante", variant: "destructive" as const, icon: AlertCircle },
  atualizacao: { label: "Atualização", variant: "secondary" as const, icon: Info },
};

export default function AnunciosPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/fastclub")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Megaphone className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Anúncios Oficiais</h1>
              <p className="text-sm text-muted-foreground">
                Novidades, atualizações e comunicados da equipa FastCRM
              </p>
            </div>
          </div>
        </motion.div>

        {/* Announcements list */}
        <div className="space-y-4">
          {SAMPLE_ANNOUNCEMENTS.map((announcement, i) => {
            const config = TYPE_CONFIG[announcement.type];
            return (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card className="border-border/60 hover:border-primary/20 transition-colors">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={config.variant} className="text-[10px] gap-1">
                            <config.icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{announcement.date}</span>
                        </div>
                        <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{announcement.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
