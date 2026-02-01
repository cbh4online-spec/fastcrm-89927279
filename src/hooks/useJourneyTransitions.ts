import { useMemo, useCallback } from "react";
import { useProfiles, useEnrollments } from "./useStudentJourney";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";
import type { SJProfile, LifecycleStage } from "@/types/studentJourney";
import {
  JourneyState,
  JourneyProfile,
  JourneyFunnelStats,
  LIFECYCLE_TO_JOURNEY_STATE,
  JOURNEY_STATE_CONFIG,
  JOURNEY_TIMING_CONFIG,
  getJourneyState,
  isActivationCandidate,
  getNextBestAction
} from "@/types/sjJourney";

// Map JourneyState back to LifecycleStage for database updates
const JOURNEY_TO_LIFECYCLE: Record<JourneyState, LifecycleStage> = {
  external_lead: 'lead',
  new_student: 'new_student',
  active_student: 'active_student',
  completed_active: 'completed_active',
  eligible_progression: 'eligible_progression',
  inactive: 'inactive',
  strategic_alumni: 'alumni'
};

export function useJourneyTransitions() {
  const { profiles, isLoading } = useProfiles();
  const { enrollments } = useEnrollments();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // ============================================
  // COMPUTE JOURNEY PROFILES
  // ============================================
  const journeyProfiles = useMemo((): JourneyProfile[] => {
    const now = new Date();
    
    return profiles.map(profile => {
      const profileEnrollments = enrollments.filter(e => e.profile_id === profile.id);
      const completedEnrollments = profileEnrollments.filter(e => 
        e.status === 'completed' || e.progress_percent >= 100
      );
      const activeEnrollments = profileEnrollments.filter(e => 
        e.status === 'active' || e.status === 'enrolled'
      );
      
      // Get current journey state
      const currentState = getJourneyState(profile);
      
      // Calculate timing metrics
      const lastActivity = profile.last_activity_at 
        ? parseISO(profile.last_activity_at) 
        : parseISO(profile.updated_at);
      const daysSinceLastActivity = differenceInDays(now, lastActivity);
      
      const lastCompletion = completedEnrollments
        .filter(e => e.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];
      const daysSinceLastCompletion = lastCompletion?.completed_at 
        ? differenceInDays(now, parseISO(lastCompletion.completed_at))
        : null;
      
      // Calculate activation score
      let activationScore = 50;
      
      // Bonus for completed courses
      activationScore += Math.min(completedEnrollments.length * 15, 30);
      
      // Bonus if past cooling period
      if (daysSinceLastCompletion !== null && 
          daysSinceLastCompletion > JOURNEY_TIMING_CONFIG.coolingPeriodDays) {
        activationScore += 15;
      }
      
      // Penalty for inactivity
      if (daysSinceLastActivity > JOURNEY_TIMING_CONFIG.inactivityThresholdDays) {
        activationScore -= 20;
      }
      
      // Bonus for defined interests
      if (profile.interests && profile.interests.length > 0) {
        activationScore += 5;
      }
      
      activationScore = Math.max(0, Math.min(100, activationScore));
      
      // Determine suggested transitions
      const suggestedTransitions: JourneyState[] = [];
      const stateConfig = JOURNEY_STATE_CONFIG[currentState];
      
      // Add valid transitions based on current state
      stateConfig.canProgressTo.forEach(nextState => {
        suggestedTransitions.push(nextState);
      });
      
      // Calculate state entry time (approximation)
      const stateEnteredAt = profile.updated_at;
      const daysInCurrentState = differenceInDays(now, parseISO(stateEnteredAt));
      
      return {
        profile,
        currentState,
        previousStates: [], // Would need audit log for history
        stateEnteredAt,
        daysInCurrentState,
        activationPriority: stateConfig.activationPriority,
        activationScore,
        isActivationCandidate: isActivationCandidate(currentState),
        totalEnrollments: profileEnrollments.length,
        completedEnrollments: completedEnrollments.length,
        activeEnrollments: activeEnrollments.length,
        daysSinceLastCompletion,
        daysSinceLastActivity,
        daysSinceLastContact: profile.last_activity_at 
          ? differenceInDays(now, parseISO(profile.last_activity_at))
          : null,
        suggestedTransitions,
        nextBestAction: getNextBestAction(currentState, profile),
        nextActionDue: profile.next_follow_up_at
      };
    });
  }, [profiles, enrollments]);

  // ============================================
  // FUNNEL STATISTICS
  // ============================================
  const funnelStats = useMemo((): JourneyFunnelStats => {
    const stats: JourneyFunnelStats = {
      external_lead: 0,
      new_student: 0,
      active_student: 0,
      completed_active: 0,
      eligible_progression: 0,
      inactive: 0,
      strategic_alumni: 0,
      activationCandidates: 0,
      readyForContact: 0,
      atRisk: 0
    };
    
    journeyProfiles.forEach(jp => {
      stats[jp.currentState]++;
      
      if (jp.isActivationCandidate) {
        stats.activationCandidates++;
      }
      
      // Ready for contact: high priority states or overdue follow-ups
      if (jp.activationPriority <= 2 && jp.activationScore > 60) {
        stats.readyForContact++;
      }
      
      // At risk: approaching inactivity threshold
      if (jp.daysSinceLastActivity > JOURNEY_TIMING_CONFIG.inactivityThresholdDays - 14) {
        stats.atRisk++;
      }
    });
    
    return stats;
  }, [journeyProfiles]);

  // ============================================
  // TRANSITION ACTIONS
  // ============================================
  const transitionProfile = useCallback(async (
    profileId: string, 
    newState: JourneyState,
    reason?: string
  ) => {
    if (!currentWorkspace?.id) return;
    
    const newLifecycleStage = JOURNEY_TO_LIFECYCLE[newState];
    
    const { error } = await supabase
      .from('sj_profiles')
      .update({ 
        lifecycle_stage: newLifecycleStage,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .eq('workspace_id', currentWorkspace.id);
    
    if (error) {
      toast.error("Erro ao atualizar estado");
      throw error;
    }
    
    toast.success(`Estado atualizado para ${JOURNEY_STATE_CONFIG[newState].label}`);
    queryClient.invalidateQueries({ queryKey: ['sj-profiles'] });
  }, [currentWorkspace?.id, queryClient]);

  // ============================================
  // AUTO-TRANSITION CHECK
  // ============================================
  const checkAutoTransitions = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    const now = new Date();
    let transitionsApplied = 0;
    
    for (const jp of journeyProfiles) {
      // Completed Active → Eligible Progression (cooling period ended)
      if (jp.currentState === 'completed_active' && 
          jp.daysSinceLastCompletion !== null &&
          jp.daysSinceLastCompletion > JOURNEY_TIMING_CONFIG.coolingPeriodDays) {
        await transitionProfile(jp.profile.id, 'eligible_progression');
        transitionsApplied++;
      }
      
      // Any completed state → Strategic Alumni (multiple completions)
      if ((jp.currentState === 'completed_active' || jp.currentState === 'eligible_progression') &&
          jp.completedEnrollments >= 3) {
        await transitionProfile(jp.profile.id, 'strategic_alumni');
        transitionsApplied++;
      }
      
      // Any active state → Inactive (inactivity threshold)
      if (!['inactive', 'external_lead'].includes(jp.currentState) &&
          jp.daysSinceLastActivity > JOURNEY_TIMING_CONFIG.churnThresholdDays) {
        await transitionProfile(jp.profile.id, 'inactive');
        transitionsApplied++;
      }
    }
    
    if (transitionsApplied > 0) {
      toast.info(`${transitionsApplied} transição(ões) automática(s) aplicada(s)`);
    }
    
    return transitionsApplied;
  }, [journeyProfiles, currentWorkspace?.id, transitionProfile]);

  // ============================================
  // FILTERED VIEWS
  // ============================================
  const activationCandidates = useMemo(() => 
    journeyProfiles
      .filter(jp => jp.isActivationCandidate)
      .sort((a, b) => b.activationScore - a.activationScore),
    [journeyProfiles]
  );

  const atRiskProfiles = useMemo(() =>
    journeyProfiles
      .filter(jp => jp.daysSinceLastActivity > JOURNEY_TIMING_CONFIG.inactivityThresholdDays - 14)
      .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity),
    [journeyProfiles]
  );

  const readyForContact = useMemo(() =>
    journeyProfiles
      .filter(jp => jp.activationPriority <= 2 && jp.activationScore > 60)
      .sort((a, b) => a.activationPriority - b.activationPriority || b.activationScore - a.activationScore),
    [journeyProfiles]
  );

  return {
    journeyProfiles,
    funnelStats,
    activationCandidates,
    atRiskProfiles,
    readyForContact,
    transitionProfile,
    checkAutoTransitions,
    isLoading,
    timingConfig: JOURNEY_TIMING_CONFIG
  };
}
