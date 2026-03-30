import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingUp, ShoppingCart, Target, BarChart3 } from "lucide-react";
import {
  useAttributionStats,
  useRevenueByTemplate,
  useRevenueBySequence,
  useRevenueByChannel,
  RevenueAggregation,
} from "@/hooks/useCommunicationAttribution";
import { useCommunicationTemplates } from "@/hooks/useCommunicationTemplates";
import { useEmailSequences } from "@/hooks/useEmailSequences";

const CONVERSION_TYPE_LABELS: Record<string, string> = {
  all: "Todas",
  store_order: "Encomendas",
  opportunity_won: "Oportunidades Ganhas",
  proposal_paid: "Propostas Pagas",
  payment_completed: "Pagamentos",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  inbox: "Inbox",
  unknown: "Outro",
};

interface Props {
  mode?: "templates" | "sequences" | "all";
}

export function RevenueAttributionDashboard({ mode = "all" }: Props) {
  const [conversionType, setConversionType] = useState<string>("all");
  const filters = conversionType !== "all" ? { conversionType } : undefined;

  const { data: stats, isLoading: loadingStats } = useAttributionStats(filters);
  const { data: byTemplate, isLoading: loadingTemplates } = useRevenueByTemplate(filters);
  const { data: bySequence, isLoading: loadingSequences } = useRevenueBySequence(filters);
  const { data: byChannel, isLoading: loadingChannels } = useRevenueByChannel(filters);
  const { data: templates } = useCommunicationTemplates();
  const { data: sequences } = useEmailSequences();

  const templateMap = new Map(templates?.map((t) => [t.id, t.name]) || []);
  const sequenceMap = new Map(sequences?.map((s) => [s.id, s.name]) || []);

  const fmt = (v: number) => `€${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={conversionType} onValueChange={setConversionType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONVERSION_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          title="Receita Atribuída"
          value={stats ? fmt(stats.totalRevenue) : undefined}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          loading={loadingStats}
        />
        <KPICard
          title="Conversões"
          value={stats?.totalConversions?.toString()}
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
          loading={loadingStats}
        />
        <KPICard
          title="AOV Atribuído"
          value={stats ? fmt(stats.avgOrderValue) : undefined}
          icon={<Target className="h-5 w-5 text-amber-600" />}
          loading={loadingStats}
        />
        <KPICard
          title="Receita Direta"
          value={stats ? fmt(stats.directRevenue) : undefined}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          loading={loadingStats}
        />
        <KPICard
          title="Receita Assistida"
          value={stats ? fmt(stats.assistedRevenue) : undefined}
          icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
          loading={loadingStats}
        />
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(mode === "templates" || mode === "all") && (
          <Leaderboard
            title="Top Templates"
            data={byTemplate}
            loading={loadingTemplates}
            nameResolver={(key) => templateMap.get(key) || key.slice(0, 8)}
            formatter={fmt}
          />
        )}
        {(mode === "sequences" || mode === "all") && (
          <Leaderboard
            title="Top Sequências"
            data={bySequence}
            loading={loadingSequences}
            nameResolver={(key) => sequenceMap.get(key) || key.slice(0, 8)}
            formatter={fmt}
          />
        )}
        <Leaderboard
          title="Top Canais"
          data={byChannel}
          loading={loadingChannels}
          nameResolver={(key) => CHANNEL_LABELS[key] || key}
          formatter={fmt}
        />
      </div>
    </div>
  );
}

// ── Sub-components ──

function KPICard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value || "€0,00"}</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Leaderboard({
  title,
  data,
  loading,
  nameResolver,
  formatter,
}: {
  title: string;
  data?: RevenueAggregation[];
  loading: boolean;
  nameResolver: (key: string) => string;
  formatter: (v: number) => string;
}) {
  const top = (data || []).filter((d) => d.key !== "unknown").slice(0, 10);
  const maxRevenue = top.length > 0 ? top[0].revenue : 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))
        ) : top.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados de atribuição
          </p>
        ) : (
          top.map((item, i) => (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[180px] font-medium">
                  {i + 1}. {nameResolver(item.key)}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.conversions} conv.
                  </Badge>
                  <span className="font-semibold text-green-600">
                    {formatter(item.revenue)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
