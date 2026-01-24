// Student Journey AI Matching Engine - Core Algorithm

import { differenceInDays } from "date-fns";
import type { SJEnrollment } from "@/types/studentJourney";
import type {
  ExtendedSJCourse,
  ExtendedSJProfile,
  CourseMatch,
  ScoreBreakdown,
  MatchReason,
  GateCheckResult,
  MatchingResult,
  CoursePrerequisite,
  CourseLevel,
  LEVEL_ORDER,
} from "@/types/sjRecommendation";

const LEVEL_ORDER_MAP: Record<CourseLevel, number> = {
  foundation: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

// ============================================
// GATE CHECKS (EXCLUSION RULES)
// ============================================

function checkGates(
  profile: ExtendedSJProfile,
  course: ExtendedSJCourse,
  completedEnrollments: SJEnrollment[]
): GateCheckResult[] {
  const failures: GateCheckResult[] = [];
  const completedCourseIds = completedEnrollments
    .filter(e => e.status === "completed")
    .map(e => e.course_id);

  // Gate 1: Already completed this course
  if (completedCourseIds.includes(course.id)) {
    failures.push({
      passed: false,
      reason: "Curso já concluído",
      gate_type: "completed",
    });
  }

  // Gate 2: Course is inactive
  if (!course.is_active) {
    failures.push({
      passed: false,
      reason: "Curso inativo",
      gate_type: "inactive",
    });
  }

  // Gate 3: Level restriction
  const profileLevel = LEVEL_ORDER_MAP[profile.current_level] || 1;
  const courseLevel = LEVEL_ORDER_MAP[course.level] || 1;
  
  // Can take courses at their level or one level above
  if (courseLevel > profileLevel + 1) {
    failures.push({
      passed: false,
      reason: `Nível do curso (${course.level}) superior ao permitido`,
      gate_type: "level",
    });
  }

  // Gate 4: Prerequisites check
  if (course.prerequisites && course.prerequisites.length > 0) {
    for (const prereq of course.prerequisites as CoursePrerequisite[]) {
      // Check required course
      if (prereq.course_id && !completedCourseIds.includes(prereq.course_id)) {
        failures.push({
          passed: false,
          reason: `Pré-requisito não cumprido: ${prereq.course_name || prereq.course_id}`,
          gate_type: "prerequisites",
        });
      }

      // Check minimum level
      if (prereq.min_level) {
        const minLevel = LEVEL_ORDER_MAP[prereq.min_level] || 1;
        if (profileLevel < minLevel) {
          failures.push({
            passed: false,
            reason: `Nível mínimo não atingido: ${prereq.min_level}`,
            gate_type: "prerequisites",
          });
        }
      }

      // Check minimum courses completed
      if (prereq.min_courses_completed) {
        if ((profile.total_courses_completed || 0) < prereq.min_courses_completed) {
          failures.push({
            passed: false,
            reason: `Necessário ter ${prereq.min_courses_completed}+ cursos concluídos`,
            gate_type: "prerequisites",
          });
        }
      }
    }
  }

  return failures;
}

// ============================================
// SCORE CALCULATION
// ============================================

function calculateThematicFit(
  profile: ExtendedSJProfile,
  course: ExtendedSJCourse
): { score: number; reasons: MatchReason[] } {
  let score = 0;
  const reasons: MatchReason[] = [];
  const maxScore = 40;

  const profileInterests = (profile.interests || []).map((i: string) => i.toLowerCase());
  const profileSpecialties = Object.keys(profile.specialties_progress || {}).map(s => s.toLowerCase());
  const courseTags = (course.tags || []).map((t: string) => t.toLowerCase());

  // Interest overlap
  const interestMatches = courseTags.filter(tag => 
    profileInterests.some(interest => 
      interest.includes(tag) || tag.includes(interest)
    )
  );
  
  if (interestMatches.length > 0) {
    const interestScore = Math.min(interestMatches.length * 10, 25);
    score += interestScore;
    reasons.push({
      type: "interest",
      text: `Interesse declarado em ${interestMatches.slice(0, 2).join(", ")}`,
      weight: interestScore,
    });
  }

  // Specialty alignment
  const specialtyMatches = courseTags.filter(tag =>
    profileSpecialties.some(spec => 
      spec.includes(tag) || tag.includes(spec)
    )
  );

  if (specialtyMatches.length > 0) {
    const specScore = Math.min(specialtyMatches.length * 8, 15);
    score += specScore;
    reasons.push({
      type: "specialty",
      text: `Alinhado com especialidade ${specialtyMatches[0]}`,
      weight: specScore,
    });
  }

  return { score: Math.min(score, maxScore), reasons };
}

function calculateProgressionFit(
  course: ExtendedSJCourse,
  completedEnrollments: SJEnrollment[],
  allCourses: ExtendedSJCourse[]
): { score: number; reasons: MatchReason[] } {
  let score = 0;
  const reasons: MatchReason[] = [];
  const maxScore = 20;

  const completedCourseIds = completedEnrollments
    .filter(e => e.status === "completed")
    .map(e => e.course_id);

  // Check if this course is in the next_courses of any completed course
  for (const enrollment of completedEnrollments.filter(e => e.status === "completed")) {
    const completedCourse = allCourses.find(c => c.id === enrollment.course_id);
    if (completedCourse?.next_courses?.includes(course.id)) {
      score = maxScore;
      const completedCourseName = completedCourse.name;
      reasons.push({
        type: "progression",
        text: `Concluiu "${completedCourseName}" — progressão natural`,
        weight: maxScore,
      });
      break;
    }
  }

  // Bonus if course builds on same specialty
  if (score === 0 && completedEnrollments.length > 0) {
    const lastCompleted = completedEnrollments
      .filter(e => e.status === "completed" && e.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];
    
    if (lastCompleted) {
      const lastCourse = allCourses.find(c => c.id === lastCompleted.course_id);
      if (lastCourse?.specialty_id && lastCourse.specialty_id === course.specialty_id) {
        score = 10;
        reasons.push({
          type: "progression",
          text: `Continuação na mesma área de especialidade`,
          weight: 10,
        });
      }
    }
  }

  return { score: Math.min(score, maxScore), reasons };
}

function calculateTimingFit(
  profile: ExtendedSJProfile,
  course: ExtendedSJCourse
): { score: number; reasons: MatchReason[] } {
  let score = 0;
  const reasons: MatchReason[] = [];
  const maxScore = 15;

  // Days since last course completed
  if (profile.last_course_completed_at) {
    const daysSince = differenceInDays(new Date(), new Date(profile.last_course_completed_at));
    
    // Optimal timing: 30-90 days after completion
    if (daysSince >= 30 && daysSince <= 90) {
      score += 8;
      reasons.push({
        type: "timing",
        text: `Última formação há ${daysSince} dias — bom timing`,
        weight: 8,
      });
    } else if (daysSince > 90 && daysSince <= 180) {
      score += 5;
      reasons.push({
        type: "timing",
        text: `${daysSince} dias desde última formação`,
        weight: 5,
      });
    } else if (daysSince > 180) {
      score += 3;
      reasons.push({
        type: "timing",
        text: `Há ${Math.floor(daysSince / 30)} meses sem formação — reativar`,
        weight: 3,
      });
    }
  }

  // Course urgency (limited spots, upcoming start)
  if (course.urgency_score && course.urgency_score > 0) {
    const urgencyBonus = Math.min(course.urgency_score, 7);
    score += urgencyBonus;
    if (course.urgency_score >= 7) {
      reasons.push({
        type: "urgency",
        text: "Vagas limitadas ou início próximo",
        weight: urgencyBonus,
      });
    }
  }

  return { score: Math.min(score, maxScore), reasons };
}

function calculateProfileFit(
  profile: ExtendedSJProfile,
  course: ExtendedSJCourse
): { score: number; reasons: MatchReason[] } {
  let score = 0;
  const reasons: MatchReason[] = [];
  const maxScore = 10;

  const recommendedFor = (course.recommended_for || []) as string[];
  
  if (recommendedFor.length > 0 && profile.role) {
    const profileRole = profile.role.toLowerCase();
    const matchedRole = recommendedFor.find(r => 
      r.toLowerCase().includes(profileRole) || profileRole.includes(r.toLowerCase())
    );
    
    if (matchedRole) {
      score = maxScore;
      reasons.push({
        type: "level",
        text: `Recomendado para o perfil "${matchedRole}"`,
        weight: maxScore,
      });
    }
  }

  // Level compatibility bonus
  const profileLevel = LEVEL_ORDER_MAP[profile.current_level] || 1;
  const courseLevel = LEVEL_ORDER_MAP[course.level] || 1;
  
  if (courseLevel === profileLevel || courseLevel === profileLevel + 1) {
    if (score === 0) {
      score = 5;
      reasons.push({
        type: "level",
        text: `Nível atual compatível com ${course.level}`,
        weight: 5,
      });
    }
  }

  return { score: Math.min(score, maxScore), reasons };
}

function calculateActivationFit(
  profile: ExtendedSJProfile
): { score: number; reasons: MatchReason[] } {
  let score = 0;
  const reasons: MatchReason[] = [];
  const maxScore = 10;

  // Higher score for high activation potential
  if (profile.activation_potential === "high") {
    score += 6;
  } else if (profile.activation_potential === "medium") {
    score += 3;
  }

  // Student score bonus
  const studentScore = profile.student_score || 0;
  if (studentScore >= 80) {
    score += 4;
    reasons.push({
      type: "similarity",
      text: `Score de aluno elevado (${studentScore}%)`,
      weight: 4,
    });
  } else if (studentScore >= 60) {
    score += 2;
  }

  return { score: Math.min(score, maxScore), reasons };
}

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

export function calculateCourseMatches(
  profile: ExtendedSJProfile,
  completedEnrollments: SJEnrollment[],
  courses: ExtendedSJCourse[]
): CourseMatch[] {
  const matches: CourseMatch[] = [];

  for (const course of courses) {
    // Check gates first
    const gateFailures = checkGates(profile, course, completedEnrollments);
    const gatesPassed = gateFailures.length === 0;

    // Calculate scores even if gates fail (for transparency)
    const thematic = calculateThematicFit(profile, course);
    const progression = calculateProgressionFit(course, completedEnrollments, courses);
    const timing = calculateTimingFit(profile, course);
    const profileFit = calculateProfileFit(profile, course);
    const activation = calculateActivationFit(profile);

    // Combine all reasons
    const allReasons = [
      ...thematic.reasons,
      ...progression.reasons,
      ...timing.reasons,
      ...profileFit.reasons,
      ...activation.reasons,
    ];

    // Calculate total score
    const breakdown: ScoreBreakdown = {
      thematic_fit: thematic.score,
      progression_fit: progression.score,
      timing_fit: timing.score,
      profile_fit: profileFit.score,
      activation_fit: activation.score,
      similarity_bonus: 0, // Reserved for future ML-based similarity
      penalties: gatesPassed ? 0 : -100,
      total: 0,
    };

    breakdown.total = Math.max(0, Math.min(100,
      breakdown.thematic_fit +
      breakdown.progression_fit +
      breakdown.timing_fit +
      breakdown.profile_fit +
      breakdown.activation_fit +
      breakdown.similarity_bonus +
      breakdown.penalties
    ));

    matches.push({
      course,
      score: gatesPassed ? breakdown.total : 0,
      breakdown,
      reasons: allReasons.sort((a, b) => b.weight - a.weight).slice(0, 5),
      gates_passed: gatesPassed,
      gate_failures: gateFailures,
    });
  }

  // Sort by score descending, filter to only passed gates
  return matches
    .filter(m => m.gates_passed)
    .sort((a, b) => b.score - a.score);
}

// ============================================
// DATA QUALITY CHECK
// ============================================

export function checkDataQuality(profile: ExtendedSJProfile): {
  has_interests: boolean;
  has_specialties: boolean;
  has_completions: boolean;
  missing_fields: string[];
  quality_score: number;
} {
  const missing: string[] = [];
  let qualityScore = 100;

  const hasInterests = (profile.interests?.length || 0) > 0;
  const hasSpecialties = Object.keys(profile.specialties_progress || {}).length > 0;
  const hasCompletions = (profile.total_courses_completed || 0) > 0;

  if (!hasInterests) {
    missing.push("interests");
    qualityScore -= 30;
  }

  if (!hasSpecialties && !profile.primary_specialty) {
    missing.push("specialties_progress ou primary_specialty");
    qualityScore -= 20;
  }

  if (!profile.role) {
    missing.push("role");
    qualityScore -= 15;
  }

  if (!profile.current_level || profile.current_level === "foundation") {
    if (hasCompletions) {
      missing.push("current_level (atualizar com base no histórico)");
      qualityScore -= 10;
    }
  }

  return {
    has_interests: hasInterests,
    has_specialties: hasSpecialties,
    has_completions: hasCompletions,
    missing_fields: missing,
    quality_score: Math.max(0, qualityScore),
  };
}

// ============================================
// FULL MATCHING RESULT
// ============================================

export function generateMatchingResult(
  profile: ExtendedSJProfile,
  completedEnrollments: SJEnrollment[],
  courses: ExtendedSJCourse[]
): MatchingResult {
  const matches = calculateCourseMatches(profile, completedEnrollments, courses);
  const dataQuality = checkDataQuality(profile);

  return {
    profile_id: profile.id,
    recommendations: matches.slice(0, 10), // Top 10
    data_quality: dataQuality,
    generated_at: new Date().toISOString(),
  };
}
