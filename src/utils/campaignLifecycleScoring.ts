import { CAMPAIGN_SCORING } from '@/types/marketing';

export interface ScoringEvent {
  eventType: string;
  count?: number;
}

/**
 * Calculates the score impact from campaign events for a contact/lead.
 * 
 * Rules:
 * - opened = +2
 * - clicked = +5
 * - multi_click (3+) = +10
 * - bounced = -10
 * - complained = -20
 * - unsubscribed = -15
 * - converted = +25
 */
export function calculateCampaignScoreImpact(events: ScoringEvent[]): number {
  let score = 0;

  const clickCount = events.filter(e => e.eventType === 'clicked').length;

  events.forEach(event => {
    switch (event.eventType) {
      case 'opened':
        score += CAMPAIGN_SCORING.opened;
        break;
      case 'clicked':
        score += CAMPAIGN_SCORING.clicked;
        break;
      case 'bounced':
        score += CAMPAIGN_SCORING.bounced;
        break;
      case 'complained':
        score += CAMPAIGN_SCORING.complained;
        break;
      case 'unsubscribed':
        score += CAMPAIGN_SCORING.unsubscribed;
        break;
      case 'converted':
        score += CAMPAIGN_SCORING.converted;
        break;
    }
  });

  // Bonus for multi-click (3+ clicks)
  if (clickCount >= 3) {
    score += CAMPAIGN_SCORING.multi_click;
  }

  return score;
}

/**
 * Returns a human-readable label for the score impact.
 */
export function getScoreImpactLabel(impact: number): { label: string; color: string } {
  if (impact >= 20) return { label: 'Muito Positivo', color: 'text-green-600' };
  if (impact > 0) return { label: 'Positivo', color: 'text-green-500' };
  if (impact === 0) return { label: 'Neutro', color: 'text-muted-foreground' };
  if (impact > -10) return { label: 'Ligeiramente Negativo', color: 'text-amber-500' };
  return { label: 'Negativo', color: 'text-destructive' };
}
