import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { useActivityProfiles, useInitializeActivityProfiles } from '@/hooks/useActivityProfiles';
import { ActivityProfile, ActivityProfileType } from '@/types/activityProfile';
import { supabase } from '@/integrations/supabase/client';

interface ActivityProfileContextType {
  profiles: ActivityProfile[];
  isLoading: boolean;
  defaultProfile: ActivityProfile | null;
  currentEntityProfile: ActivityProfile | null;
  setCurrentEntityProfile: (profile: ActivityProfile | null) => void;
  getProfileByCode: (code: string) => ActivityProfile | undefined;
  getProfileByType: (type: ActivityProfileType) => ActivityProfile | undefined;
  isModuleActive: (module: string) => boolean;
  isFieldVisible: (entityType: 'contact' | 'company' | 'opportunity', fieldName: string) => boolean;
  getTerminology: (key: string) => string;
  initializeProfiles: () => Promise<void>;
}

const ActivityProfileContext = createContext<ActivityProfileContextType | null>(null);

export function ActivityProfileProvider({ children }: { children: React.ReactNode }) {
  const workspaceContext = useWorkspace();
  const currentWorkspace = workspaceContext?.currentWorkspace;
  const { data: profiles = [], isLoading } = useActivityProfiles();
  const initMutation = useInitializeActivityProfiles();
  const [defaultProfile, setDefaultProfile] = useState<ActivityProfile | null>(null);
  const [currentEntityProfile, setCurrentEntityProfile] = useState<ActivityProfile | null>(null);

  // Fetch workspace default profile
  useEffect(() => {
    async function fetchDefaultProfile() {
      if (!currentWorkspace?.id || profiles.length === 0) {
        setDefaultProfile(null);
        return;
      }

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('default_activity_profile_id')
        .eq('id', currentWorkspace.id)
        .single();

      if (workspace?.default_activity_profile_id) {
        const profile = profiles.find(p => p.id === workspace.default_activity_profile_id);
        setDefaultProfile(profile || null);
      } else {
        // Use generic profile as default
        const genericProfile = profiles.find(p => p.code === 'generico');
        setDefaultProfile(genericProfile || profiles[0] || null);
      }
    }

    fetchDefaultProfile();
  }, [currentWorkspace?.id, profiles]);

  const getProfileByCode = (code: string) => {
    return profiles.find(p => p.code === code);
  };

  const getProfileByType = (type: ActivityProfileType) => {
    return profiles.find(p => p.profile_type === type);
  };

  // Use current entity profile if set, otherwise use default
  const activeProfile = currentEntityProfile || defaultProfile;

  const isModuleActive = (module: string): boolean => {
    if (!activeProfile) return true;
    return activeProfile.active_modules.includes(module);
  };

  const isFieldVisible = (
    entityType: 'contact' | 'company' | 'opportunity',
    fieldName: string
  ): boolean => {
    if (!activeProfile) return true;
    
    const entityKey = entityType === 'contact' ? 'contacts' : 
                      entityType === 'company' ? 'companies' : 'opportunities';
    
    // Check hidden fields first
    const hiddenFields = activeProfile.hidden_fields[entityKey] || [];
    if (hiddenFields.includes(fieldName)) return false;
    
    // If visible_fields is defined and not empty, only show those
    const visibleFields = activeProfile.visible_fields[entityKey] || [];
    if (visibleFields.length > 0) {
      return visibleFields.includes(fieldName);
    }
    
    return true;
  };

  const getTerminology = (key: string): string => {
    const defaults: Record<string, string> = {
      client: 'cliente',
      deal: 'oportunidade',
      product: 'produto',
      meeting: 'reunião',
    };

    if (!activeProfile) return defaults[key] || key;
    return activeProfile.ai_context.terminology?.[key] || defaults[key] || key;
  };

  const initializeProfiles = async () => {
    await initMutation.mutateAsync();
  };

  return (
    <ActivityProfileContext.Provider
      value={{
        profiles,
        isLoading,
        defaultProfile,
        currentEntityProfile,
        setCurrentEntityProfile,
        getProfileByCode,
        getProfileByType,
        isModuleActive,
        isFieldVisible,
        getTerminology,
        initializeProfiles,
      }}
    >
      {children}
    </ActivityProfileContext.Provider>
  );
}

export function useActivityProfileContext() {
  const context = useContext(ActivityProfileContext);
  if (!context) {
    throw new Error('useActivityProfileContext must be used within an ActivityProfileProvider');
  }
  return context;
}
