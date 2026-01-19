import { useMemo } from 'react';
import { useActivityProfileContext } from '@/contexts/ActivityProfileContext';

/**
 * Hook to determine field visibility based on active activity profile
 */
export function useProfileFieldVisibility(entityType: 'contact' | 'company' | 'opportunity') {
  const { currentEntityProfile, defaultProfile, isFieldVisible } = useActivityProfileContext();
  
  const activeProfile = currentEntityProfile || defaultProfile;
  
  const checkFieldVisibility = useMemo(() => {
    return (fieldName: string): boolean => {
      return isFieldVisible(entityType, fieldName);
    };
  }, [entityType, isFieldVisible]);
  
  const getVisibleFields = useMemo(() => {
    return (fields: string[]): string[] => {
      return fields.filter(field => isFieldVisible(entityType, field));
    };
  }, [entityType, isFieldVisible]);
  
  return {
    activeProfile,
    isFieldVisible: checkFieldVisibility,
    getVisibleFields,
  };
}

/**
 * Hook to get module visibility based on active activity profile
 */
export function useProfileModuleVisibility() {
  const { currentEntityProfile, defaultProfile, isModuleActive } = useActivityProfileContext();
  
  const activeProfile = currentEntityProfile || defaultProfile;
  
  return {
    activeProfile,
    isModuleActive,
  };
}
