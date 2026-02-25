import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Users, TrendingUp, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const EVENT_ICONS: Record<string, typeof Zap> = {
  signup: Users,
  activation: Zap,
  upgrade: TrendingUp,
  trial_started: Target,
  trial_expired: Target,
  feature_used: Zap,
};

interface Props {
  companyId: string;
  workspaceId: string;
}

export function ProductSignalsSection({ companyId, workspaceId }: Props) {
  // Get contacts for this company, then their signals
  const { data: signals, isLoading } = useQuery({
    queryKey: ["company-product-signals", companyId],
    queryFn: async () => {
      // Get contacts linked to this company
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, email")
        .eq("workspace_id", workspaceId)
        .eq("company", companyId);

      if (!contacts || contacts.length === 0) return [];

      const emails = contacts.map((c) => c.email).filter(Boolean);
      if (emails.length === 0) return [];

      const { data, error } = await supabase
        .from("product_signals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("email", emails)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId && !!workspaceId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> Product Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> Product Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem sinais de produto para esta empresa.
          </p>
        </CardContent>
      </Card>
    );
  }

  const aggregated = {
    total: signals.length,
    signups: signals.filter((s: any) => s.event_type === "signup").length,
    activations: signals.filter((s: any) => s.event_type === "activation").length,
    upgrades: signals.filter((s: any) => s.event_type === "upgrade").length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Product Signals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregate */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/40 rounded">
            <p className="text-lg font-bold">{aggregated.signups}</p>
            <p className="text-[10px] text-muted-foreground">Signups</p>
          </div>
          <div className="text-center p-2 bg-muted/40 rounded">
            <p className="text-lg font-bold">{aggregated.activations}</p>
            <p className="text-[10px] text-muted-foreground">Activated</p>
          </div>
          <div className="text-center p-2 bg-muted/40 rounded">
            <p className="text-lg font-bold">{aggregated.upgrades}</p>
            <p className="text-[10px] text-muted-foreground">Upgrades</p>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {signals.slice(0, 10).map((signal: any) => {
            const Icon = EVENT_ICONS[signal.event_type] || Zap;
            return (
              <div key={signal.id} className="flex items-center gap-2 text-sm">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate flex-1">{signal.email}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {signal.event_type}
                </Badge>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: pt })}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
