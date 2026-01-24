import { useMemo } from "react";
import { useProfiles, useCourses, useEnrollments } from "./useStudentJourney";
import type { 
  ProgressionCandidate, 
  LeadFunnelItem, 
  ActivationAlert, 
  GrowthMetrics,
  ProgressionType,
  ActivationPriority,
  ActivationOpportunity
} from "@/types/sjActivation";
import { differenceInDays, parseISO, subDays } from "date-fns";

const COOLING_OFF_DAYS = 14; // Período após conclusão antes de abordar
const DORMANT_THRESHOLD_DAYS = 60; // Dias sem atividade = adormecido
const STALE_LEAD_DAYS = 7; // Lead sem contacto há X dias

export function useSJActivation() {
  const { profiles, isLoading: profilesLoading } = useProfiles();
  const { courses } = useCourses();
  const { enrollments } = useEnrollments();

  // ============================================
  // PROGRESSION CANDIDATES (Alumni prontos)
  // ============================================
  const progressionCandidates = useMemo((): ProgressionCandidate[] => {
    const now = new Date();
    
    // Perfis que completaram pelo menos 1 curso
    const completedProfiles = profiles.filter(p => 
      p.lifecycle_stage === "completed" || 
      enrollments.some(e => e.profile_id === p.id && e.status === "completed")
    );

    return completedProfiles.map(profile => {
      const profileEnrollments = enrollments.filter(e => e.profile_id === profile.id);
      const completedEnrollments = profileEnrollments.filter(e => e.status === "completed");
      
      // Última conclusão
      const lastCompleted = completedEnrollments
        .filter(e => e.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];
      
      const lastCompletedAt = lastCompleted?.completed_at || profile.updated_at;
      const daysSinceCompletion = differenceInDays(now, parseISO(lastCompletedAt));
      
      // Calcular score de progressão (0-100)
      let progressionScore = 50;
      
      // Bonus por múltiplos cursos completados
      progressionScore += Math.min(completedEnrollments.length * 10, 30);
      
      // Bonus se passou período de cooling
      if (daysSinceCompletion > COOLING_OFF_DAYS) {
        progressionScore += 15;
      }
      
      // Penalidade se muito tempo sem contacto
      if (daysSinceCompletion > 90) {
        progressionScore -= 10;
      }
      
      // Bonus por interesses definidos
      if (profile.interests && profile.interests.length > 0) {
        progressionScore += 5;
      }

      progressionScore = Math.max(0, Math.min(100, progressionScore));

      // Sugerir próximos cursos baseado em interesses
      const completedCourseIds = completedEnrollments.map(e => e.course_id);
      const suggestedNextCourses = courses.filter(c => 
        c.is_active && 
        !completedCourseIds.includes(c.id)
      ).slice(0, 3);

      // Determinar tipo de progressão
      const progressionType: ProgressionType = completedEnrollments.length >= 2 ? 'certification' : 
                             completedEnrollments.length === 1 ? 'upsell' : 'cross_sell';

      return {
        profile,
        completedEnrollments,
        lastCompletedAt,
        daysSinceCompletion,
        progressionType,
        progressionScore,
        suggestedNextCourses,
        interests: profile.interests || [],
        totalCoursesCompleted: completedEnrollments.length,
        estimatedValue: completedEnrollments.length * 500, // Placeholder
        lastContactAt: profile.last_activity_at,
        preferredChannel: profile.preferred_channel
      };
    }).sort((a, b) => b.progressionScore - a.progressionScore);
  }, [profiles, enrollments, courses]);

  // ============================================
  // LEAD FUNNEL
  // ============================================
  const leadFunnel = useMemo((): LeadFunnelItem[] => {
    const now = new Date();
    
    const leads = profiles.filter(p => 
      p.lifecycle_stage === "lead" || p.lifecycle_stage === "prospect"
    );

    return leads.map(profile => {
      const daysInFunnel = differenceInDays(now, parseISO(profile.created_at));
      
      // Determinar estágio no funil
      let stage: LeadFunnelItem['stage'] = 'new';
      if (profile.last_activity_at) {
        stage = 'contacted';
      }
      if (profile.lifecycle_stage === 'prospect') {
        stage = 'qualified';
      }

      // Score de qualificação
      let qualificationScore = 30;
      if (profile.email) qualificationScore += 15;
      if (profile.phone) qualificationScore += 15;
      if (profile.primary_interest) qualificationScore += 20;
      if (profile.interests && profile.interests.length > 0) qualificationScore += 10;
      if (profile.preferred_channel !== 'email') qualificationScore += 10; // Canal preferido definido

      return {
        profile,
        stage,
        entryDate: profile.created_at,
        daysInFunnel,
        source: 'manual', // Could be expanded
        interestedIn: profile.interests || [],
        touchpointsCount: 0, // Would need touchpoints data
        lastTouchpoint: profile.last_activity_at,
        qualificationScore: Math.min(100, qualificationScore),
        assignedTo: profile.owner_user_id,
        nextAction: profile.next_follow_up_at ? 'Follow-up agendado' : 'Qualificar lead',
        nextActionDue: profile.next_follow_up_at
      };
    }).sort((a, b) => b.qualificationScore - a.qualificationScore);
  }, [profiles]);

  // ============================================
  // ACTIVATION ALERTS
  // ============================================
  const activationAlerts = useMemo((): ActivationAlert[] => {
    const now = new Date();
    const alerts: ActivationAlert[] = [];

    // 1. Alumni prontos para upsell (passaram cooling period)
    progressionCandidates
      .filter(c => c.daysSinceCompletion >= COOLING_OFF_DAYS && c.daysSinceCompletion < 90)
      .slice(0, 5)
      .forEach(candidate => {
        alerts.push({
          id: `upsell-${candidate.profile.id}`,
          type: 'ready_for_upsell',
          priority: candidate.progressionScore > 70 ? 'high' : 'medium',
          profile: candidate.profile,
          message: `Completou ${candidate.totalCoursesCompleted} curso(s) há ${candidate.daysSinceCompletion} dias`,
          suggestedAction: `Propor ${candidate.suggestedNextCourses[0]?.name || 'próxima formação'}`,
          dueDate: null,
          metadata: { 
            progressionScore: candidate.progressionScore,
            suggestedCourses: candidate.suggestedNextCourses.map(c => c.id)
          },
          createdAt: now.toISOString()
        });
      });

    // 2. Alumni adormecidos (>60 dias sem atividade)
    progressionCandidates
      .filter(c => c.daysSinceCompletion > DORMANT_THRESHOLD_DAYS)
      .slice(0, 5)
      .forEach(candidate => {
        alerts.push({
          id: `dormant-${candidate.profile.id}`,
          type: 'dormant_alumni',
          priority: 'medium',
          profile: candidate.profile,
          message: `Sem atividade há ${candidate.daysSinceCompletion} dias`,
          suggestedAction: 'Campanha de reativação',
          dueDate: null,
          metadata: { daysDormant: candidate.daysSinceCompletion },
          createdAt: now.toISOString()
        });
      });

    // 3. Leads estagnados
    leadFunnel
      .filter(l => l.daysInFunnel > STALE_LEAD_DAYS && l.stage === 'new')
      .slice(0, 5)
      .forEach(lead => {
        alerts.push({
          id: `stale-${lead.profile.id}`,
          type: 'lead_stale',
          priority: 'high',
          profile: lead.profile,
          message: `Lead sem contacto há ${lead.daysInFunnel} dias`,
          suggestedAction: 'Primeiro contacto urgente',
          dueDate: null,
          metadata: { daysInFunnel: lead.daysInFunnel },
          createdAt: now.toISOString()
        });
      });

    // 4. Follow-ups atrasados
    profiles
      .filter(p => p.next_follow_up_at && parseISO(p.next_follow_up_at) < now)
      .slice(0, 5)
      .forEach(profile => {
        const daysOverdue = differenceInDays(now, parseISO(profile.next_follow_up_at!));
        alerts.push({
          id: `overdue-${profile.id}`,
          type: 'follow_up_overdue',
          priority: daysOverdue > 3 ? 'urgent' : 'high',
          profile,
          message: `Follow-up atrasado ${daysOverdue} dia(s)`,
          suggestedAction: 'Contactar imediatamente',
          dueDate: profile.next_follow_up_at,
          metadata: { daysOverdue },
          createdAt: now.toISOString()
        });
      });

    return alerts.sort((a, b) => {
      const priorityOrder: Record<ActivationPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [progressionCandidates, leadFunnel, profiles]);

  // ============================================
  // GROWTH METRICS
  // ============================================
  const growthMetrics = useMemo((): GrowthMetrics => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    // Alumni = completed at least one course
    const alumni = profiles.filter(p => 
      p.lifecycle_stage === "completed" ||
      enrollments.some(e => e.profile_id === p.id && e.status === "completed")
    );

    const leads = profiles.filter(p => 
      p.lifecycle_stage === "lead" || p.lifecycle_stage === "prospect"
    );

    const newLeadsThisWeek = leads.filter(l => 
      parseISO(l.created_at) >= weekAgo
    ).length;

    const qualifiedLeads = leads.filter(l => l.lifecycle_stage === "prospect");

    // Alumni ready for progression (passed cooling period)
    const readyForProgression = progressionCandidates.filter(c => 
      c.daysSinceCompletion >= COOLING_OFF_DAYS && c.daysSinceCompletion < 90
    ).length;

    // Alumni dormant (>60 days)
    const dormantAlumni = progressionCandidates.filter(c => 
      c.daysSinceCompletion > DORMANT_THRESHOLD_DAYS
    ).length;

    // Conversion rate
    const totalEnrolled = profiles.filter(p => 
      ["enrolled", "active", "completed"].includes(p.lifecycle_stage)
    ).length;
    const conversionRate = leads.length + totalEnrolled > 0 
      ? (totalEnrolled / (leads.length + totalEnrolled)) * 100 
      : 0;

    // Average courses per alumni
    const totalCompletedEnrollments = enrollments.filter(e => e.status === "completed").length;
    const avgCoursesPerAlumni = alumni.length > 0 
      ? totalCompletedEnrollments / alumni.length 
      : 0;

    return {
      // Alumni Base
      totalAlumni: alumni.length,
      alumniReadyForProgression: readyForProgression,
      alumniDormant: dormantAlumni,
      alumniReactivatedThisMonth: 0, // Would need tracking
      averageCoursesPerAlumni: Math.round(avgCoursesPerAlumni * 10) / 10,
      
      // Lead Funnel
      totalLeads: leads.length,
      newLeadsThisWeek,
      leadsQualified: qualifiedLeads.length,
      leadConversionRate: Math.round(conversionRate * 10) / 10,
      averageTimeToConvert: 14, // Placeholder
      
      // Activation Performance
      activationRate: readyForProgression > 0 ? 75 : 0, // Placeholder
      progressionRate: avgCoursesPerAlumni > 1 ? 30 : 0, // Placeholder
      reactivationRate: 15, // Placeholder
      averageLifetimeValue: alumni.length * 750, // Placeholder
      
      // Pipeline Value
      pipelineValue: leads.length * 500, // Placeholder
      expectedRevenueThisMonth: (readyForProgression * 500) + (qualifiedLeads.length * 300)
    };
  }, [profiles, enrollments, progressionCandidates]);

  // ============================================
  // ALL ACTIVATION OPPORTUNITIES (combined view)
  // ============================================
  const activationOpportunities = useMemo((): ActivationOpportunity[] => {
    const opportunities: ActivationOpportunity[] = [];

    // From progression candidates
    progressionCandidates.slice(0, 10).forEach(candidate => {
      opportunities.push({
        id: `prog-${candidate.profile.id}`,
        profile: candidate.profile,
        type: 'progression',
        priority: candidate.progressionScore > 80 ? 'high' : 
                 candidate.progressionScore > 60 ? 'medium' : 'low',
        score: candidate.progressionScore,
        reason: `Completou ${candidate.totalCoursesCompleted} curso(s)`,
        suggestedAction: `Propor ${candidate.suggestedNextCourses[0]?.name || 'próxima formação'}`,
        suggestedCourses: candidate.suggestedNextCourses,
        lastContact: candidate.lastContactAt,
        daysSinceLastActivity: candidate.daysSinceCompletion,
        enrollmentsCompleted: candidate.totalCoursesCompleted,
        totalRevenue: candidate.estimatedValue,
        tags: candidate.interests
      });
    });

    // From lead funnel
    leadFunnel.slice(0, 10).forEach(lead => {
      opportunities.push({
        id: `lead-${lead.profile.id}`,
        profile: lead.profile,
        type: 'lead_qualification',
        priority: lead.daysInFunnel > STALE_LEAD_DAYS ? 'high' : 
                 lead.qualificationScore > 60 ? 'medium' : 'low',
        score: lead.qualificationScore,
        reason: lead.interestedIn.length > 0 
          ? `Interesse: ${lead.interestedIn.join(', ')}`
          : 'Novo lead a qualificar',
        suggestedAction: lead.nextAction || 'Primeiro contacto',
        lastContact: lead.lastTouchpoint,
        daysSinceLastActivity: lead.daysInFunnel,
        enrollmentsCompleted: 0,
        totalRevenue: 0,
        tags: lead.interestedIn
      });
    });

    return opportunities.sort((a, b) => {
      const priorityOrder: Record<ActivationPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [progressionCandidates, leadFunnel]);

  return {
    progressionCandidates,
    leadFunnel,
    activationAlerts,
    growthMetrics,
    activationOpportunities,
    isLoading: profilesLoading
  };
}
