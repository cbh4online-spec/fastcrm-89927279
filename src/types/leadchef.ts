/**
 * LeadChef — Tipos do módulo
 * Mobile-first CRM para leads, demonstrações, clientes e referências.
 */

export type LeadChefStage =
  | "new"
  | "to_contact"
  | "in_conversation"
  | "demo_scheduled"
  | "demo_done"
  | "proposal_decision"
  | "won"
  | "lost"
  | "reactivate_later";

export type LeadChefTemperature = "cold" | "warm" | "hot";

export type LeadChefActivityType =
  | "phone_call"
  | "whatsapp"
  | "follow_up"
  | "demo"
  | "post_sale_visit"
  | "cooking_class"
  | "custom_visit"
  | "proposal"
  | "sale"
  | "referral"
  | "recruitment"
  | "team_meeting"
  | "training"
  | "social_media"
  | "note";

export interface LeadChefTodayItem {
  id: string;
  title: string;
  subtitle?: string;
  type: LeadChefActivityType;
  scheduledAt?: string; // ISO
  leadName?: string;
  stage?: LeadChefStage;
  priority?: "low" | "medium" | "high";
}

export interface LeadChefMockLead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  stage: LeadChefStage;
  temperature: LeadChefTemperature;
  lastActivityAt?: string;
  nextActionAt?: string;
  notes?: string;
}
