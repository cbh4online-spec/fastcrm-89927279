import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck, User, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { EventRSVP } from "@/hooks/useEvents";

interface EventCheckInTabProps {
  rsvps: EventRSVP[];
  eventId: string;
}

export function EventCheckInTab({ rsvps, eventId }: EventCheckInTabProps) {
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const filtered = rsvps.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q));
  });

  const checkedIn = filtered.filter((r) => r.status === "attended");
  const pending = filtered.filter((r) => r.status !== "attended" && r.status !== "declined");

  const handleCheckIn = async (rsvp: EventRSVP) => {
    setLoadingId(rsvp.id);
    try {
      const { error } = await (supabase.from("event_rsvps").update({
        status: "attended",
        checked_in_at: new Date().toISOString(),
      } as any) as any).eq("id", rsvp.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["event-rsvps", eventId] });
      toast.success(`${rsvp.name || "Convidado"} marcado como presente!`);
    } catch {
      toast.error("Erro ao fazer check-in");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar convidado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="outline" className="gap-1.5 py-1">
          <UserCheck className="h-3 w-3 text-emerald-500" />
          {checkedIn.length} presentes
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1">
          <Clock className="h-3 w-3 text-amber-500" />
          {pending.length} pendentes
        </Badge>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendentes</p>
          {pending.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{r.email || r.phone || "—"}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCheckIn(r)}
                  disabled={loadingId === r.id}
                  className="gap-1.5 rounded-full"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Check-in
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Checked in */}
      {checkedIn.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Presentes</p>
          {checkedIn.map((r) => (
            <Card key={r.id} className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{r.email || r.phone || "—"}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-xs">
                  ✓ Presente
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum convidado encontrado
          </CardContent>
        </Card>
      )}
    </div>
  );
}
