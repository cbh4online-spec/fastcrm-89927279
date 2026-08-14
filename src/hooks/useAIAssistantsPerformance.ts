/**
 * useAIAssistantsPerformance
 * Real performance metrics for the AI Assistants module (Fase 1).
 * Sources: ai_usage_logs (volume/cost/latency/errors), ai_message_audit (respostas geradas),
 * conversations (handoffs / conversas tocadas por IA).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type PerformancePeriod = 7 | 30 | 90;

export interface DailyPoint {
  date: string;
  requests: number;
  cost: number;
}

export interface FeatureUsage {
  feature: string;
  requests: number;
  cost: number;
  errors: number;
}

export interface AIConversationRow {
  id: string;
  channel: string | null;
  lastMessageAt: string | null;
  preview: string | null;
  requiresHuman: boolean;
  handoffAt: string | null;
  resolvedAt: string | null;
  sentiment: string | null;
}

export interface AIPerformanceData {
  totalRequests: number;
  totalCostUsd: number;
  avgLatencyMs: number | null;
  errorRate: number;
  cacheHitRate: number;
  botMessages: number;
  aiConversations: number;
  handoffs: number;
  handoffRate: number;
  resolvedWithoutHuman: number;
  resolutionRate: number;
  daily: DailyPoint[];
  byFeature: FeatureUsage[];
  recentConversations: AIConversationRow[];
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useAIAssistantsPerformance(period: PerformancePeriod = 30) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const since = isoDaysAgo(period);

  return useQuery<AIPerformanceData>({
    queryKey: ["ai-assistants-performance", workspaceId, period],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const [usageRes, auditRes, convRes] = await Promise.all([
        supabase
          .from("ai_usage_logs")
          .select("feature, cost_usd, latency_ms, was_error, was_cached, created_at")
          .eq("workspace_id", workspaceId!)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
        supabase
          .from("ai_message_audit")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId!)
          .gte("created_at", since),
        supabase
          .from("conversations")
          .select(
            "id, channel, last_message_at, last_message_preview, requires_human, handoff_at, resolved_at, ai_sentiment, ai_analysis_at",
          )
          .eq("workspace_id", workspaceId!)
          .not("ai_analysis_at", "is", null)
          .gte("ai_analysis_at", since)
          .order("last_message_at", { ascending: false })
          .limit(500),
      ]);

      if (usageRes.error) throw usageRes.error;
      if (convRes.error) throw convRes.error;

      const usage = usageRes.data ?? [];
      const conversations = convRes.data ?? [];

      const totalRequests = usage.length;
      const totalCostUsd = usage.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
      const latencies = usage
        .map((r) => Number(r.latency_ms ?? 0))
        .filter((v) => v > 0);
      const avgLatencyMs = latencies.length
        ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
        : null;
      const errors = usage.filter((r) => r.was_error).length;
      const cached = usage.filter((r) => r.was_cached).length;

      // Daily series
      const dailyMap = new Map<string, DailyPoint>();
      for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap.set(key, { date: key, requests: 0, cost: 0 });
      }
      for (const r of usage) {
        const key = String(r.created_at).slice(0, 10);
        const point = dailyMap.get(key);
        if (point) {
          point.requests += 1;
          point.cost += Number(r.cost_usd ?? 0);
        }
      }

      // By feature
      const featureMap = new Map<string, FeatureUsage>();
      for (const r of usage) {
        const key = r.feature || "outros";
        const item = featureMap.get(key) ?? { feature: key, requests: 0, cost: 0, errors: 0 };
        item.requests += 1;
        item.cost += Number(r.cost_usd ?? 0);
        if (r.was_error) item.errors += 1;
        featureMap.set(key, item);
      }

      const handoffs = conversations.filter((c) => c.handoff_at || c.requires_human).length;
      const resolvedWithoutHuman = conversations.filter(
        (c) => c.resolved_at && !c.handoff_at && !c.requires_human,
      ).length;
      const aiConversations = conversations.length;

      return {
        totalRequests,
        totalCostUsd,
        avgLatencyMs,
        errorRate: totalRequests ? (errors / totalRequests) * 100 : 0,
        cacheHitRate: totalRequests ? (cached / totalRequests) * 100 : 0,
        botMessages: auditRes.count ?? 0,
        aiConversations,
        handoffs,
        handoffRate: aiConversations ? (handoffs / aiConversations) * 100 : 0,
        resolvedWithoutHuman,
        resolutionRate: aiConversations ? (resolvedWithoutHuman / aiConversations) * 100 : 0,
        daily: Array.from(dailyMap.values()),
        byFeature: Array.from(featureMap.values()).sort((a, b) => b.requests - a.requests).slice(0, 8),
        recentConversations: conversations.slice(0, 15).map((c) => ({
          id: c.id,
          channel: c.channel ?? null,
          lastMessageAt: c.last_message_at ?? null,
          preview: c.last_message_preview ?? null,
          requiresHuman: !!c.requires_human,
          handoffAt: c.handoff_at ?? null,
          resolvedAt: c.resolved_at ?? null,
          sentiment: c.ai_sentiment ?? null,
        })),
      };
    },
  });
}
