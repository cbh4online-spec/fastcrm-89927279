/**
 * LeadChef — Tipos do módulo (Fase 2).
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

export type LeadChefReferralStatus =
  | "received"
  | "to_contact"
  | "contacted"
  | "converted"
  | "no_authorization"
  | "not_interested"
  | "reactivate_later";

export type LeadChefAuthorizationStatus = "unknown" | "granted" | "denied";

// ─── Persisted entities ──────────────────────────────────────────────────────

export interface LeadChefLeadProfile {
  id: string;
  workspace_id: string;
  lead_id: string;
  stage: LeadChefStage;
  interest: string | null;
  origin: string | null;
  temperature: LeadChefTemperature;
  next_action_type: LeadChefActivityType | null;
  next_action_at: string | null;
  next_action_note: string | null;
  cycle: Record<string, unknown>;
  customer_experience: Record<string, unknown>;
  recruitment_potential: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadChefLeadBase {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  last_contact_at: string | null;
  ai_temperature: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
}

export interface LeadChefLeadWithProfile {
  profile: LeadChefLeadProfile;
  lead: LeadChefLeadBase;
}

export interface LeadChefGoal {
  id: string;
  workspace_id: string;
  user_id: string;
  period_month: string; // ISO date
  leads_goal: number;
  contacts_goal: number;
  demos_goal: number;
  sales_goal: number;
  referrals_goal: number;
  recruitment_goal: number;
  income_goal: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadChefReferral {
  id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  referred_by_lead_id: string | null;
  referred_by_contact_id: string | null;
  authorization_status: LeadChefAuthorizationStatus;
  status: LeadChefReferralStatus;
  converted_lead_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadChefCustomerExperience {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  contact_id: string | null;
  household_size: number | null;
  profession: string | null;
  preferred_schedule: string | null;
  current_device_model: string | null;
  has_recipe_platform: boolean | null;
  recipe_platform_active: boolean | null;
  usage_frequency: string | null;
  interests: string[];
  perceived_benefits: string[];
  objections: string[];
  preferred_purchase_option: string | null;
  next_experience_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Inputs / DTOs ───────────────────────────────────────────────────────────

export interface CreateLeadChefLeadInput {
  name: string;
  phone: string;
  email?: string;
  origin: string;
  interest: string;
  nextActionType?: LeadChefActivityType;
  nextActionAt?: string | null;
  nextActionNote?: string;
  temperature: LeadChefTemperature;
  notes?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface UpdateLeadChefLeadStageInput {
  profileId: string;
  leadId: string;
  stage: LeadChefStage;
}

// ─── Today / dashboard data ──────────────────────────────────────────────────

export interface LeadChefTodayAction {
  id: string;
  leadId: string;
  leadName: string;
  type: LeadChefActivityType | null;
  scheduledAt: string | null;
  note: string | null;
  stage: LeadChefStage;
  phone: string | null;
}

export interface LeadChefMonthlyProgress {
  salesDone: number;
  salesGoal: number;
  demosDone: number;
  demosGoal: number;
  newLeads: number;
  leadsGoal: number;
  percent: number;
}

export interface LeadChefTodayData {
  overdueActions: LeadChefTodayAction[];
  todayActions: LeadChefTodayAction[];
  scheduledDemos: LeadChefTodayAction[];
  newLeadsWithoutContact: LeadChefTodayAction[];
  pendingProposals: LeadChefTodayAction[];
  monthlyProgress: LeadChefMonthlyProgress;
}

// ─── Appointments (Fase 4) ───────────────────────────────────────────────────

export type LeadChefAppointmentType =
  | "phone_call"
  | "whatsapp"
  | "follow_up"
  | "demo"
  | "post_sale_visit"
  | "cooking_class"
  | "custom_visit"
  | "proposal"
  | "referral"
  | "recruitment"
  | "team_meeting"
  | "training"
  | "note"
  | "other";

export type LeadChefAppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "overdue";

export type LeadChefAppointmentOutcome =
  | "done"
  | "no_answer"
  | "rescheduled"
  | "proposal_sent"
  | "won"
  | "no_interest"
  | "needs_followup"
  | "asked_info"
  | "asked_later";

export interface LeadChefAppointment {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  profile_id: string | null;
  type: LeadChefAppointmentType;
  status: LeadChefAppointmentStatus;
  title: string;
  notes: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  is_online: boolean;
  completed_at: string | null;
  cancelled_at: string | null;
  outcome: LeadChefAppointmentOutcome | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: { id: string; name: string; phone: string | null; email: string | null } | null;
}

export type LeadChefAgendaPeriod = "today" | "week" | "month" | "overdue" | "all";

export interface LeadChefAgendaGroup {
  date: string;
  label: string;
  items: LeadChefAppointment[];
}

export interface LeadChefAgendaData {
  groups: LeadChefAgendaGroup[];
  counters: {
    today: number;
    week: number;
    month: number;
    overdue: number;
    total: number;
  };
}

// ─── Mock helpers (still useful for empty state) ─────────────────────────────

export interface LeadChefTodayItem {
  id: string;
  title: string;
  subtitle?: string;
  type: LeadChefActivityType;
  scheduledAt?: string;
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
