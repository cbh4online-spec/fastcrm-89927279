import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { LeadFlowWeek } from "@/hooks/useSalesPerformance";
import { Users } from "lucide-react";

const SOURCE_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(0, 84%, 60%)",
  "hsl(190, 80%, 45%)",
  "hsl(330, 70%, 55%)",
];

interface Props {
  data: LeadFlowWeek[] | undefined;
  sources: string[] | undefined;
  isLoading: boolean;
}

export function LeadFlowChart({ data, sources, isLoading }: Props) {
  const { t } = useTranslation("reports");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {t("weekly_lead_flow")}
        </CardTitle>
        <CardDescription>{t("by_source")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px]" />
        ) : !data?.length ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            {t("no_leads")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {sources?.map((source, i) => (
                <Bar
                  key={source}
                  dataKey={source}
                  stackId="leads"
                  fill={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                  radius={i === (sources.length - 1) ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
