import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Link2, TrendingUp, UserCheck, Loader2 } from "lucide-react";

export function AggregatedDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["fastmatch-aggregated-stats"],
    queryFn: async () => {
      const [profilesRes, verifiedRes, connectionsRes] = await Promise.all([
        supabase.from("fastmatch_profiles").select("id", { count: "exact", head: true }),
        supabase.from("fastmatch_profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("fastmatch_connections").select("id", { count: "exact", head: true }),
      ]);

      const total = profilesRes.count ?? 0;
      const verified = verifiedRes.count ?? 0;
      const connections = connectionsRes.count ?? 0;
      const rate = total > 0 ? Math.min(Math.round((connections / total) * 100), 100) : 0;

      return [
        { label: "Total Membros", value: String(total), icon: Users },
        { label: "Verificados", value: String(verified), icon: UserCheck },
        { label: "Conexoes Feitas", value: String(connections), icon: Link2 },
        { label: "Taxa de Match", value: `${rate}%`, icon: TrendingUp },
      ];
    },
  });

  const items = stats ?? [
    { label: "Total Membros", value: "—", icon: Users },
    { label: "Verificados", value: "—", icon: UserCheck },
    { label: "Conexoes Feitas", value: "—", icon: Link2 },
    { label: "Taxa de Match", value: "—", icon: TrendingUp },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((s) => (
        <Card key={s.label} className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : s.value}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
