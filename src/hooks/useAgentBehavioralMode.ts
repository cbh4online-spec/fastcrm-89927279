/**
 * Hook for Agent Behavioral Mode Selection
 * 
 * Provides mode selection and management for AI agents.
 * Uses localStorage for preferences until dedicated DB tables are created.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  selectBehavioralMode,
  buildModeSelectionContext,
} from '@/lib/agentBehavioralModeSelector';
import type {
  BehavioralMode,
  ModeSelectionContext,
  ModeSelectionResult,
  WorkspaceModeSettings,
  UserModePreferences,
  ModeAnalyticsEvent,
  BusinessStrategy,
} from '@/types/agentBehavioralModes';
import {
  DEFAULT_WORKSPACE_MODE_SETTINGS,
  getModeDisplayName,
  getModeOutputModifiers,
  BEHAVIORAL_MODE_DEFINITIONS,
  getModeIcon,
  getModeColor,
} from '@/types/agentBehavioralModes';

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

const WORKSPACE_SETTINGS_KEY = 'agent_behavioral_mode_settings';
const USER_PREFERENCES_KEY = 'agent_behavioral_mode_preferences';

function getStorageKey(baseKey: string, workspaceId: string, userId?: string): string {
  if (userId) {
    return `${baseKey}_${workspaceId}_${userId}`;
  }
  return `${baseKey}_${workspaceId}`;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useAgentBehavioralMode() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const userId = user?.id;

  // Load workspace settings from localStorage
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceModeSettings | null>(() => {
    if (typeof window === 'undefined' || !workspaceId) return null;
    
    try {
      const stored = localStorage.getItem(getStorageKey(WORKSPACE_SETTINGS_KEY, workspaceId));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[BehavioralMode] Failed to load workspace settings:', e);
    }
    
    return {
      ...DEFAULT_WORKSPACE_MODE_SETTINGS,
      workspaceId,
    };
  });

  // Load user preferences from localStorage
  const [userPreferences, setUserPreferences] = useState<UserModePreferences | null>(() => {
    if (typeof window === 'undefined' || !workspaceId || !userId) return null;
    
    try {
      const stored = localStorage.getItem(getStorageKey(USER_PREFERENCES_KEY, workspaceId, userId));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[BehavioralMode] Failed to load user preferences:', e);
    }
    
    return {
      userId,
      workspaceId,
      preferExplicitReasoning: true,
      preferConciseOutputs: false,
    };
  });

  // Update settings when workspace changes
  useEffect(() => {
    if (!workspaceId) return;
    
    try {
      const stored = localStorage.getItem(getStorageKey(WORKSPACE_SETTINGS_KEY, workspaceId));
      if (stored) {
        setWorkspaceSettings(JSON.parse(stored));
      } else {
        setWorkspaceSettings({
          ...DEFAULT_WORKSPACE_MODE_SETTINGS,
          workspaceId,
        });
      }
    } catch (e) {
      setWorkspaceSettings({
        ...DEFAULT_WORKSPACE_MODE_SETTINGS,
        workspaceId,
      });
    }
  }, [workspaceId]);

  // Update preferences when user/workspace changes
  useEffect(() => {
    if (!workspaceId || !userId) return;
    
    try {
      const stored = localStorage.getItem(getStorageKey(USER_PREFERENCES_KEY, workspaceId, userId));
      if (stored) {
        setUserPreferences(JSON.parse(stored));
      } else {
        setUserPreferences({
          userId,
          workspaceId,
          preferExplicitReasoning: true,
          preferConciseOutputs: false,
        });
      }
    } catch (e) {
      setUserPreferences({
        userId,
        workspaceId,
        preferExplicitReasoning: true,
        preferConciseOutputs: false,
      });
    }
  }, [workspaceId, userId]);

  // Select mode for a given context
  const selectMode = useCallback((
    entityType: 'lead' | 'opportunity' | 'contact' | 'company',
    entityId: string,
    entityData?: Record<string, unknown>,
    overrides?: {
      pipelineStage?: string;
      dealValue?: number;
      isPreAction?: boolean;
      actionType?: string;
      forceMode?: BehavioralMode;
    }
  ): ModeSelectionResult => {
    // Build context
    const context = buildModeSelectionContext({
      entityType,
      entityId,
      entityData,
      pipelineStage: overrides?.pipelineStage,
      dealValue: overrides?.dealValue,
      userRole: 'agent',
      businessStrategy: workspaceSettings?.businessStrategy || 'balanced',
      isPreAction: overrides?.isPreAction,
      actionType: overrides?.actionType,
    });
    
    // Force mode override
    if (overrides?.forceMode) {
      return {
        selectedMode: overrides.forceMode,
        definition: BEHAVIORAL_MODE_DEFINITIONS[overrides.forceMode],
        selectionReason: 'Modo forçado explicitamente',
        confidenceInSelection: 1,
        alternativeModes: [],
        wasOverridden: true,
        overrideSource: 'explicit',
      };
    }
    
    // Select using algorithm
    return selectBehavioralMode(
      context,
      workspaceSettings || undefined,
      userPreferences || undefined
    );
  }, [workspaceSettings, userPreferences]);

  // Track mode selection (async, non-blocking)
  const trackModeSelection = useCallback(async (
    result: ModeSelectionResult,
    entityType: string,
    entityId: string,
    context: Partial<ModeSelectionContext>
  ) => {
    if (!workspaceId || !userId) return;
    
    // Log to analytics
    try {
      await supabase.from('ai_analytics_events').insert({
        workspace_id: workspaceId,
        user_id: userId,
        event_type: 'recommendation_generated',
        entity_type: entityType,
        entity_id: entityId,
        properties: {
          behavioral_mode: result.selectedMode,
          mode_selection_reason: result.selectionReason,
          mode_was_overridden: result.wasOverridden,
          mode_override_source: result.overrideSource,
          confidence_level: context.confidenceLevel || 'medium',
          data_completeness: context.dataCompleteness || 0.5,
          pipeline_stage: context.pipelineStage,
          business_strategy: context.businessStrategy || 'balanced',
        },
      });
    } catch (err) {
      console.warn('[BehavioralMode] Failed to track mode selection:', err);
    }
  }, [workspaceId, userId]);

  // Get output modifiers for a mode
  const getOutputModifiers = useCallback((mode: BehavioralMode) => {
    return getModeOutputModifiers(mode);
  }, []);

  // Get mode display info
  const getModeInfo = useCallback((mode: BehavioralMode) => {
    const definition = BEHAVIORAL_MODE_DEFINITIONS[mode];
    return {
      mode,
      displayName: definition.displayName,
      description: definition.description,
      icon: getModeIcon(mode),
      color: getModeColor(mode),
      characteristics: definition.characteristics,
      communication: definition.communication,
    };
  }, []);

  // Get all available modes
  const allModes = useMemo(() => {
    return Object.values(BEHAVIORAL_MODE_DEFINITIONS).map(def => ({
      mode: def.mode,
      displayName: def.displayName,
      description: def.description,
      icon: getModeIcon(def.mode),
      color: getModeColor(def.mode),
    }));
  }, []);

  return {
    // Current settings
    workspaceSettings,
    userPreferences,
    
    // Mode selection
    selectMode,
    trackModeSelection,
    
    // Utilities
    getOutputModifiers,
    getModeInfo,
    allModes,
    
    // Quick access
    defaultMode: workspaceSettings?.defaultMode || 'exploratory',
    businessStrategy: workspaceSettings?.businessStrategy || 'balanced',
  };
}

// =============================================================================
// WORKSPACE SETTINGS MANAGEMENT
// =============================================================================

export function useWorkspaceModeSettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [isUpdating, setIsUpdating] = useState(false);

  const updateSettings = useCallback(async (updates: Partial<WorkspaceModeSettings>) => {
    if (!workspaceId) throw new Error('Workspace not found');
    
    setIsUpdating(true);
    
    try {
      // Load current settings
      const storageKey = getStorageKey(WORKSPACE_SETTINGS_KEY, workspaceId);
      let current: WorkspaceModeSettings;
      
      try {
        const stored = localStorage.getItem(storageKey);
        current = stored ? JSON.parse(stored) : { ...DEFAULT_WORKSPACE_MODE_SETTINGS, workspaceId };
      } catch {
        current = { ...DEFAULT_WORKSPACE_MODE_SETTINGS, workspaceId };
      }
      
      // Merge updates
      const newSettings: WorkspaceModeSettings = {
        ...current,
        ...updates,
        workspaceId,
        updatedAt: new Date().toISOString(),
      };
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(newSettings));
      
      return newSettings;
    } finally {
      setIsUpdating(false);
    }
  }, [workspaceId]);

  return {
    updateSettings,
    isUpdating,
  };
}

// =============================================================================
// USER PREFERENCES MANAGEMENT
// =============================================================================

export function useUserModePreferences() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const userId = user?.id;
  const [isUpdating, setIsUpdating] = useState(false);

  const setTemporaryOverride = useCallback(async (params: {
    mode: BehavioralMode;
    reason: string;
    durationMinutes?: number;
  }) => {
    if (!workspaceId || !userId) throw new Error('User/Workspace not found');
    
    setIsUpdating(true);
    
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (params.durationMinutes || 60));
      
      const storageKey = getStorageKey(USER_PREFERENCES_KEY, workspaceId, userId);
      let current: UserModePreferences;
      
      try {
        const stored = localStorage.getItem(storageKey);
        current = stored ? JSON.parse(stored) : {
          userId,
          workspaceId,
          preferExplicitReasoning: true,
          preferConciseOutputs: false,
        };
      } catch {
        current = {
          userId,
          workspaceId,
          preferExplicitReasoning: true,
          preferConciseOutputs: false,
        };
      }
      
      const newPreferences: UserModePreferences = {
        ...current,
        temporaryOverride: {
          mode: params.mode,
          reason: params.reason,
          expiresAt: expiresAt.toISOString(),
        },
      };
      
      localStorage.setItem(storageKey, JSON.stringify(newPreferences));
      
      return newPreferences;
    } finally {
      setIsUpdating(false);
    }
  }, [workspaceId, userId]);

  const clearTemporaryOverride = useCallback(async () => {
    if (!workspaceId || !userId) throw new Error('User/Workspace not found');
    
    setIsUpdating(true);
    
    try {
      const storageKey = getStorageKey(USER_PREFERENCES_KEY, workspaceId, userId);
      
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const current = JSON.parse(stored) as UserModePreferences;
          const { temporaryOverride, ...rest } = current;
          localStorage.setItem(storageKey, JSON.stringify(rest));
        }
      } catch {
        // Ignore errors
      }
    } finally {
      setIsUpdating(false);
    }
  }, [workspaceId, userId]);

  return {
    setTemporaryOverride,
    clearTemporaryOverride,
    isUpdating,
  };
}

// =============================================================================
// QUICK MODE COMMANDS
// =============================================================================

/**
 * Parse natural language mode commands
 * e.g., "Sê mais conservador" → risk_control mode
 */
export function parseModeCommand(command: string): {
  mode: BehavioralMode | null;
  reason: string;
} {
  const lowerCommand = command.toLowerCase();
  
  // Conservative / Risk-focused
  if (
    lowerCommand.includes('conservador') ||
    lowerCommand.includes('cuidado') ||
    lowerCommand.includes('risco') ||
    lowerCommand.includes('cautela')
  ) {
    return { mode: 'risk_control', reason: 'Pedido de abordagem conservadora' };
  }
  
  // Execution / Action-focused
  if (
    lowerCommand.includes('execut') ||
    lowerCommand.includes('ação') ||
    lowerCommand.includes('fech') ||
    lowerCommand.includes('rápido')
  ) {
    return { mode: 'execution', reason: 'Pedido de foco em execução' };
  }
  
  // Educational / Explain
  if (
    lowerCommand.includes('explic') ||
    lowerCommand.includes('porquê') ||
    lowerCommand.includes('entender') ||
    lowerCommand.includes('razão')
  ) {
    return { mode: 'educational', reason: 'Pedido de explicação' };
  }
  
  // Exploratory
  if (
    lowerCommand.includes('opç') ||
    lowerCommand.includes('alternativ') ||
    lowerCommand.includes('possibilid') ||
    lowerCommand.includes('explorar')
  ) {
    return { mode: 'exploratory', reason: 'Pedido de exploração de opções' };
  }
  
  // Validation
  if (
    lowerCommand.includes('verific') ||
    lowerCommand.includes('confirm') ||
    lowerCommand.includes('validar')
  ) {
    return { mode: 'validation', reason: 'Pedido de validação' };
  }
  
  return { mode: null, reason: 'Comando não reconhecido' };
}
