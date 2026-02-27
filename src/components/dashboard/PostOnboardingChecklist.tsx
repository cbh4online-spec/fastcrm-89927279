import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, X, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  path: string;
  check: () => Promise<boolean>;
}

export function PostOnboardingChecklist() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const items: ChecklistItem[] = [
    {
      id: "first_lead",
      label: "Criar primeiro lead",
      description: "Adiciona o teu primeiro contacto comercial",
      path: "/dashboard/leads",
      check: async () => {
        if (!currentWorkspace) return false;
        const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "first_opportunity",
      label: "Criar primeira oportunidade",
      description: "Regista um deal no teu pipeline",
      path: "/dashboard/opportunities",
      check: async () => {
        if (!currentWorkspace) return false;
        const { count } = await supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "daily_brief",
      label: "Ver Daily Brief",
      description: "Consulta o resumo diário do teu negócio",
      path: "/dashboard",
      check: async () => {
        if (!currentWorkspace) return false;
        const { count } = await (supabase as any).from("daily_briefs").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id);
        return (count || 0) > 0;
      },
    },
    {
      id: "import_contacts",
      label: "Importar contactos",
      description: "Importa a tua base de contactos existente",
      path: "/dashboard/contacts",
      check: async () => {
        if (!currentWorkspace) return false;
        const { count } = await supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id);
        return (count || 0) >= 5;
      },
    },
    {
      id: "configure_channel",
      label: "Configurar canal de comunicação",
      description: "Liga WhatsApp, Email ou outro canal",
      path: "/dashboard/channels",
      check: async () => {
        if (!currentWorkspace) return false;
        const { count } = await (supabase as any).from("channel_connections").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).eq("status", "connected");
        return (count || 0) > 0;
      },
    },
  ];

  // Check if within 7 days of onboarding completion
  useEffect(() => {
    if (!currentWorkspace) return;
    const checkVisibility = async () => {
      const { data } = await supabase
        .from("workspace_onboarding" as any)
        .select("completed_at")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if ((data as any)?.completed_at) {
        const completedAt = new Date((data as any).completed_at as string);
        const daysSince = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 7) {
          setVisible(true);
        }
      }
    };
    checkVisibility();
  }, [currentWorkspace]);

  // Run checks
  useEffect(() => {
    if (!visible || !currentWorkspace) return;
    const runChecks = async () => {
      setLoading(true);
      const results: Record<string, boolean> = {};
      for (const item of items) {
        try {
          results[item.id] = await item.check();
        } catch {
          results[item.id] = false;
        }
      }
      setCompleted(results);
      setLoading(false);
    };
    runChecks();
  }, [visible, currentWorkspace]);

  if (!visible || dismissed || loading) return null;

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = (completedCount / items.length) * 100;

  // All done — hide
  if (completedCount === items.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl border border-primary/20 bg-card p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Primeiros Passos</h3>
              <p className="text-xs text-muted-foreground">{completedCount}/{items.length} completos</p>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Progress value={progress} className="h-1.5" />

        <div className="space-y-2">
          {items.map((item) => {
            const isDone = completed[item.id];
            return (
              <button
                key={item.id}
                onClick={() => !isDone && navigate(item.path)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  isDone
                    ? "bg-muted/30 opacity-60"
                    : "hover:bg-muted/50 cursor-pointer"
                }`}
                disabled={isDone}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                {!isDone && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
