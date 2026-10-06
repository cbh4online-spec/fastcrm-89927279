import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Mail, Phone, MessageCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Badge } from "@/components/ui/badge";
import type { resolveWhatsAppAvailability } from "@/lib/whatsapp/availability";

interface Props {
  contactId: string;
  workspaceId?: string;
  email?: string | null;
  phone?: string | null;
  whatsapp: ReturnType<typeof resolveWhatsAppAvailability>;
  marketingOptIn: boolean;
  preferences: Record<string, boolean> | null;
}

/** Destaque: contacto, próxima ação e estado de consentimento (nunca escondido). */
export function ContactEssentialsCard({ contactId, workspaceId, email, phone, whatsapp, marketingOptIn, preferences }: Props) {
  const { workspaceClient } = useWorkspaceInstance();
  const { data: next, isLoading, isError, error } = useQuery({
    queryKey: ["tasks", "next-action", workspaceId, contactId],
    enabled: !!workspaceId,
    queryFn: async () => {
      // Mesmo cliente e campos que useTasks (tasks: related_type/related_id, estados pending/done).
      const { data, error } = await workspaceClient
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("related_type", "contact")
        .eq("related_id", contactId)
        .not("status", "in", "(done,completed,cancelled)")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(1);
      if (error) throw error;
      // React Query não aceita undefined: null = sem tarefas pendentes (diferente de erro).
      return ((data ?? [])[0] ?? null) as { id: string; title: string; due_at: string | null } | null;
    },
  });
  const prefsOff = Object.entries(preferences ?? {}).filter(([, v]) => v === false).map(([k]) => k);
  const waBlocked = !whatsapp.canOpen && whatsapp.status !== "invalid_number";

  return (
    <section aria-label="Essencial do contacto" className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-card p-3 sm:grid-cols-3 sm:p-4">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Contacto</p>
        <p className="flex min-w-0 items-center gap-1.5 text-sm"><Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{email || "Sem email"}</span></p>
        <p className="flex min-w-0 items-center gap-1.5 text-sm"><Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{phone || "Sem telefone"}</span></p>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Próxima ação</p>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p>
          : isError ? <p className="text-sm text-destructive" role="alert">Não foi possível carregar tarefas. Tente novamente mais tarde.</p>
          : next ? (
            <p className="flex min-w-0 items-start gap-1.5 text-sm">
              <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0"><span className="line-clamp-2">{next.title}</span>
                {next.due_at && <span className="block text-xs text-muted-foreground">{new Date(next.due_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" })}</span>}
              </span>
            </p>
          ) : <p className="text-sm text-muted-foreground">Sem próxima ação agendada</p>}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Consentimento</p>
        <p className="flex items-center gap-1.5 text-sm">
          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className={waBlocked ? "text-destructive" : undefined}>{whatsapp.label}</span>
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="gap-1 text-[11px]">
            {marketingOptIn ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            Marketing: {marketingOptIn ? "consentido" : "sem consentimento"}
          </Badge>
          {prefsOff.map((k) => (
            <Badge key={k} variant="outline" className="text-[11px]">Não contactar por {k === "phone" ? "telefone" : k}</Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
