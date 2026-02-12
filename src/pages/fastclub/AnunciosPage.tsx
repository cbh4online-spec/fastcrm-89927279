import { motion } from "framer-motion";
import { ArrowLeft, Megaphone, AlertCircle, Info, Star, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary"; icon: typeof Star }> = {
  novo: { label: "Novo", variant: "default", icon: Star },
  importante: { label: "Importante", variant: "destructive", icon: AlertCircle },
  atualizacao: { label: "Atualização", variant: "secondary", icon: Info },
};

export default function AnunciosPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["fastclub-anuncios", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("fastclub_content_sections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("page_key", "anuncios")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate("/club/fastclub")} className="gap-2 text-muted-foreground hover:text-foreground">
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
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">A carregar anúncios...</div>
        ) : announcements.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
            <Inbox className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum anúncio disponível.</p>
            <p className="text-xs text-muted-foreground">Os anúncios oficiais aparecerão aqui.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, i) => {
              const type = (announcement.metadata as any)?.type || "novo";
              const config = TYPE_CONFIG[type] || TYPE_CONFIG.novo;
              const date = announcement.created_at
                ? new Date(announcement.created_at).toLocaleDateString("pt-PT")
                : "";
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
                            <span className="text-xs text-muted-foreground">{date}</span>
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
        )}
      </div>
    </div>
  );
}
