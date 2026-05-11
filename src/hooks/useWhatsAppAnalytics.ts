import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const sb = supabase as any;

export interface WhatsAppAnalyticsKPIs {
  totalCampaigns: number;
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  optouts: number;
  deliveryRate: number; // %
  readRate: number; // %
  failureRate: number; // %
  optoutRate: number; // %
}

export interface WhatsAppCampaignMetric {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  skipped_count: number;
  deliveryRate: number;
  readRate: number;
  created_at: string;
  completed_at: string | null;
}

export interface WhatsAppDayPoint {
  day: string; // YYYY-MM-DD
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface WhatsAppHourPoint {
  weekday: number; // 0=Sun..6=Sat
  hour: number; // 0..23
  count: number;
}

export interface WhatsAppAnalyticsData {
  kpis: WhatsAppAnalyticsKPIs;
  campaigns: WhatsAppCampaignMetric[];
  series: WhatsAppDayPoint[];
  heatmap: WhatsAppHourPoint[];
  bestHour: { weekday: number; hour: number; count: number } | null;
}

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export function useWhatsAppAnalytics(days = 30) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["whatsapp-analytics", wid, days],
    enabled: !!wid,
    staleTime: 60_000,
    queryFn: async (): Promise<WhatsAppAnalyticsData> => {
      const sinceISO = new Date(Date.now() - days * 86400000).toISOString();

      // Campaigns
      const { data: campaignsRaw, error: cErr } = await sb
        .from("whatsapp_campaigns")
        .select(
          "id,name,status,total_recipients,sent_count,delivered_count,read_count,failed_count,skipped_count,created_at,completed_at"
        )
        .eq("workspace_id", wid)
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false });
      if (cErr) throw cErr;

      const campaigns: WhatsAppCampaignMetric[] = (campaignsRaw || []).map((c: any) => ({
        ...c,
        deliveryRate: pct(c.delivered_count || 0, c.sent_count || 0),
        readRate: pct(c.read_count || 0, c.delivered_count || 0),
      }));

      // Recipients (for time series)
      const { data: recips, error: rErr } = await sb
        .from("whatsapp_campaign_recipients")
        .select("status,sent_at,delivered_at,read_at,failed_at")
        .eq("workspace_id", wid)
        .gte("created_at", sinceISO)
        .limit(10000);
      if (rErr) throw rErr;

      // Opt-outs in window
      const { count: optoutsCount, error: oErr } = await sb
        .from("whatsapp_optouts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wid)
        .gte("created_at", sinceISO);
      if (oErr) throw oErr;

      const totals = (campaigns || []).reduce(
        (acc, c) => {
          acc.totalRecipients += c.total_recipients || 0;
          acc.sent += c.sent_count || 0;
          acc.delivered += c.delivered_count || 0;
          acc.read += c.read_count || 0;
          acc.failed += c.failed_count || 0;
          return acc;
        },
        { totalRecipients: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
      );

      const optouts = optoutsCount || 0;
      const kpis: WhatsAppAnalyticsKPIs = {
        totalCampaigns: campaigns.length,
        totalRecipients: totals.totalRecipients,
        sent: totals.sent,
        delivered: totals.delivered,
        read: totals.read,
        failed: totals.failed,
        optouts,
        deliveryRate: pct(totals.delivered, totals.sent),
        readRate: pct(totals.read, totals.delivered),
        failureRate: pct(totals.failed, totals.sent),
        optoutRate: pct(optouts, totals.sent),
      };

      // Build daily series
      const buckets = new Map<string, WhatsAppDayPoint>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        buckets.set(d, { day: d, sent: 0, delivered: 0, read: 0, failed: 0 });
      }
      const bump = (ts: string | null, key: keyof WhatsAppDayPoint) => {
        if (!ts) return;
        const d = ts.slice(0, 10);
        const b = buckets.get(d);
        if (b) (b[key] as number)++;
      };
      // Build heatmap (weekday × hour) from sent_at
      const heatMap = new Map<string, WhatsAppHourPoint>();
      for (let w = 0; w < 7; w++) {
        for (let h = 0; h < 24; h++) {
          heatMap.set(`${w}-${h}`, { weekday: w, hour: h, count: 0 });
        }
      }
      for (const r of recips || []) {
        bump(r.sent_at, "sent");
        bump(r.delivered_at, "delivered");
        bump(r.read_at, "read");
        bump(r.failed_at, "failed");
        if (r.sent_at) {
          const d = new Date(r.sent_at);
          const key = `${d.getDay()}-${d.getHours()}`;
          const cell = heatMap.get(key);
          if (cell) cell.count++;
        }
      }
      const heatmap = Array.from(heatMap.values());
      const bestHour = heatmap.reduce<WhatsAppAnalyticsData["bestHour"]>(
        (best, cur) => (cur.count > (best?.count ?? 0) ? cur : best),
        null,
      );

      return { kpis, campaigns, series: Array.from(buckets.values()), heatmap, bestHour };
    },
  });
}
