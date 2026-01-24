// Student Journey AI Matching Engine Types

import type { SJProfile, SJCourse, SJEnrollment } from "./studentJourney";

// ============================================
// COURSE LEVEL & MATCHING TYPES
// ============================================

export type CourseLevel = "foundation" | "intermediate" | "advanced" | "expert";

export type RecommendationStatus = "new" | "shown" | "contacted" | "converted" | "dismissed";

export type RecommendationCreator = "ai" | "user";

// Level progression order
export const LEVEL_ORDER: Record<CourseLevel, number> = {
  foundation: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export const LEVEL_CONFIG: Record<CourseLevel, { label: string; color: string; bgColor: string }> = {
  foundation: { label: "Básico", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  intermediate: { label: "Intermédio", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  advanced: { label: "Avançado", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  expert: { label: "Especialista", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

export const RECOMMENDATION_STATUS_CONFIG: Record<RecommendationStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: "Nova", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  shown: { label: "Visualizada", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-800/50" },
  contacted: { label: "Contactado", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  converted: { label: "Convertido", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  dismissed: { label: "Descartada", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

// ============================================
// PREREQUISITE & CONFIGURATION
// ============================================

export interface CoursePrerequisite {
  course_id?: string;
  course_name?: string; // For display
  min_level?: CourseLevel;
  required_tags?: string[];
  min_courses_completed?: number;
}

export interface ExtendedSJCourse extends SJCourse {
  level: CourseLevel;
  prerequisites: CoursePrerequisite[];
  recommended_for: string[];
  next_courses: string[];
  urgency_score: number;
  duration_hours: number | null;
  price: number | null;
  specialty_id: string | null;
}

export interface ExtendedSJProfile extends SJProfile {
  current_level: CourseLevel;
  role: string | null;
  recommendations_enabled: boolean;
}

// ============================================
// MATCHING SCORE BREAKDOWN
// ============================================

export interface ScoreBreakdown {
  thematic_fit: number;       // 0-40: tag overlap
  progression_fit: number;    // 0-20: next_courses chain
  timing_fit: number;         // 0-15: last completion + urgency
  profile_fit: number;        // 0-10: recommended_for match
  activation_fit: number;     // 0-10: activation_potential + student_score
  similarity_bonus: number;   // 0-5: similar students converted
  penalties: number;          // negative adjustments
  total: number;              // final score 0-100
}

export interface MatchReason {
  type: "progression" | "interest" | "timing" | "level" | "specialty" | "urgency" | "similarity";
  text: string;
  weight: number;
}

// ============================================
// RECOMMENDATION ENTITY
// ============================================

export interface SJCourseRecommendation {
  id: string;
  workspace_id: string;
  profile_id: string;
  course_id: string;
  match_score: number;
  match_reasons: MatchReason[];
  score_breakdown: ScoreBreakdown;
  recommended_at: string;
  status: RecommendationStatus;
  dismissed_reason: string | null;
  dismissed_at: string | null;
  contacted_at: string | null;
  converted_at: string | null;
  created_by: RecommendationCreator;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: SJProfile;
  course?: ExtendedSJCourse;
}

// ============================================
// GATE CHECK RESULT
// ============================================

export interface GateCheckResult {
  passed: boolean;
  reason?: string;
  gate_type?: "completed" | "prerequisites" | "level" | "inactive";
}

// ============================================
// MATCHING ENGINE INPUT/OUTPUT
// ============================================

export interface MatchingInput {
  profile: ExtendedSJProfile;
  completedEnrollments: SJEnrollment[];
  courses: ExtendedSJCourse[];
  allProfiles?: ExtendedSJProfile[]; // For similarity matching
}

export interface CourseMatch {
  course: ExtendedSJCourse;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: MatchReason[];
  gates_passed: boolean;
  gate_failures: GateCheckResult[];
}

export interface MatchingResult {
  profile_id: string;
  recommendations: CourseMatch[];
  data_quality: {
    has_interests: boolean;
    has_specialties: boolean;
    has_completions: boolean;
    missing_fields: string[];
    quality_score: number; // 0-100
  };
  generated_at: string;
}

// ============================================
// DASHBOARD OPPORTUNITY
// ============================================

export interface RecommendationOpportunity {
  recommendation: SJCourseRecommendation;
  profile: ExtendedSJProfile;
  course: ExtendedSJCourse;
  urgency: "high" | "medium" | "low";
  suggested_action: string;
  suggested_message?: string;
}

// ============================================
// DISMISS REASONS
// ============================================

export const DISMISS_REASONS = [
  { value: "not_interested", label: "Aluno não tem interesse" },
  { value: "timing_wrong", label: "Timing não é adequado" },
  { value: "already_contacted", label: "Já contactado por outro canal" },
  { value: "price_barrier", label: "Barreira de preço" },
  { value: "wrong_recommendation", label: "Recomendação incorreta" },
  { value: "duplicate", label: "Duplicado" },
  { value: "other", label: "Outro motivo" },
] as const;

export type DismissReason = typeof DISMISS_REASONS[number]["value"];
