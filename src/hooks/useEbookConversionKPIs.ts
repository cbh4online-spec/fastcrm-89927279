import { useMemo } from "react";
import type { EbookView, EbookCtaEvent } from "./useEbookAnalytics";
import type { EbookCta } from "./useEbookCtas";

export interface ConversionKPIs {
  // Captação
  totalViews: number;
  gatedLeads: number;
  consentsGiven: number;
  marketingOptIns: number;
  contactsCreated: number;  // new contacts (no contact_id before)
  contactsMatched: number;  // existing CRM contacts
  leadGateRate: number;
  consentRate: number;
  optInRate: number;

  // Conversão
  ctaImpressions: number;
  ctaClicks: number;
  ctaCtr: number;
  ctaRanking: { ctaId: string; label: string; impressions: number; clicks: number; ctr: number }[];
  
  // Funil
  funnelData: { stage: string; value: number; pct: number }[];

  // Por origem
  leadsBySource: Record<string, number>;
  leadsByCampaign: Record<string, number>;
}

export function useEbookConversionKPIs(
  views: EbookView[],
  ctaEvents: EbookCtaEvent[],
  ctas: EbookCta[],
): ConversionKPIs {
  return useMemo(() => {
    const totalViews = views.length;
    const gatedLeads = views.filter(v => v.reader_email).length;
    const consentsGiven = views.filter(v => v.consent_given).length;
    const marketingOptIns = views.filter(v => v.marketing_opt_in).length;
    const contactsMatched = views.filter(v => v.contact_id).length;
    const contactsCreated = gatedLeads - contactsMatched; // approximation

    const leadGateRate = totalViews > 0 ? Math.round((gatedLeads / totalViews) * 100) : 0;
    const consentRate = gatedLeads > 0 ? Math.round((consentsGiven / gatedLeads) * 100) : 0;
    const optInRate = gatedLeads > 0 ? Math.round((marketingOptIns / gatedLeads) * 100) : 0;

    const ctaImpressions = ctaEvents.filter(e => e.event_type === "cta_impression").length;
    const ctaClicks = ctaEvents.filter(e => e.event_type === "cta_click").length;
    const ctaCtr = ctaImpressions > 0 ? Math.round((ctaClicks / ctaImpressions) * 100) : 0;

    // CTA ranking
    const ctaMap: Record<string, { impressions: number; clicks: number }> = {};
    ctaEvents.forEach(e => {
      if (!ctaMap[e.cta_id]) ctaMap[e.cta_id] = { impressions: 0, clicks: 0 };
      if (e.event_type === "cta_impression") ctaMap[e.cta_id].impressions++;
      if (e.event_type === "cta_click") ctaMap[e.cta_id].clicks++;
    });

    const ctaRanking = Object.entries(ctaMap)
      .map(([ctaId, stats]) => {
        const cta = ctas.find(c => c.id === ctaId);
        return {
          ctaId,
          label: cta?.label || ctaId.slice(0, 8),
          impressions: stats.impressions,
          clicks: stats.clicks,
          ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 100) : 0,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    // Funnel
    const funnelStages = [
      { stage: "Views", value: totalViews },
      { stage: "Leads", value: gatedLeads },
      { stage: "Consentidos", value: consentsGiven },
      { stage: "No CRM", value: contactsMatched },
      { stage: "CTA Clicks", value: ctaClicks },
    ];
    const funnelData = funnelStages.map(s => ({
      ...s,
      pct: totalViews > 0 ? Math.round((s.value / totalViews) * 100) : 0,
    }));

    // Leads by source
    const leadsBySource: Record<string, number> = {};
    const leadsByCampaign: Record<string, number> = {};
    views.filter(v => v.reader_email).forEach(v => {
      const src = v.utm_source || v.referrer || "directo";
      leadsBySource[src] = (leadsBySource[src] || 0) + 1;
      if (v.utm_medium) {
        // use campaign if available
      }
    });
    views.filter(v => v.reader_email && (v as any).utm_campaign).forEach(v => {
      const camp = (v as any).utm_campaign || "sem campanha";
      leadsByCampaign[camp] = (leadsByCampaign[camp] || 0) + 1;
    });

    return {
      totalViews, gatedLeads, consentsGiven, marketingOptIns,
      contactsCreated: Math.max(0, contactsCreated), contactsMatched,
      leadGateRate, consentRate, optInRate,
      ctaImpressions, ctaClicks, ctaCtr, ctaRanking,
      funnelData,
      leadsBySource, leadsByCampaign,
    };
  }, [views, ctaEvents, ctas]);
}
