import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { SalesFunction, AgeGroup } from '@/data/adaptiveDashboardMock';

export interface AdaptiveLayoutConfig {
  textSizeClass: string;
  showGamification: boolean;
  metricsColumns: 2 | 3 | 4;
  showBenchmarks: boolean;
  showProjections: boolean;
  maxAlerts: number;
  compactMode: boolean;
}

const layoutDefaults: Record<AgeGroup, Partial<AdaptiveLayoutConfig>> = {
  young: {
    textSizeClass: 'text-base',
    showGamification: true,
    compactMode: false,
  },
  standard: {
    textSizeClass: 'text-base',
    showGamification: false,
    compactMode: false,
  },
  senior: {
    textSizeClass: 'text-lg',
    showGamification: false,
    compactMode: true,
  },
};

const functionDefaults: Record<SalesFunction, Partial<AdaptiveLayoutConfig>> = {
  vendedor: {
    metricsColumns: 4,
    showBenchmarks: true,
    showProjections: true,
    maxAlerts: 3,
  },
  gestor: {
    metricsColumns: 4,
    showBenchmarks: true,
    showProjections: true,
    maxAlerts: 5,
  },
  diretor: {
    metricsColumns: 3,
    showBenchmarks: true,
    showProjections: true,
    maxAlerts: 3,
  },
  ceo: {
    metricsColumns: 3,
    showBenchmarks: false,
    showProjections: true,
    maxAlerts: 2,
  },
};

function calculateAgeGroup(birthDate: string | null): AgeGroup {
  if (!birthDate) return 'standard';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  
  if (age < 30) return 'young';
  if (age > 50) return 'senior';
  return 'standard';
}

export function useAdaptiveDashboard() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['adaptive-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase
        .from('profiles')
        .select('birth_date, sales_function')
        .eq('user_id', user.id)
        .maybeSingle() as any);
      return data as { birth_date: string | null; sales_function: SalesFunction | null } | null;
    },
    enabled: !!user?.id,
  });

  const ageGroup = useMemo(() => 
    calculateAgeGroup(profile?.birth_date ?? null),
    [profile?.birth_date]
  );

  const salesFunction: SalesFunction = profile?.sales_function ?? 'gestor';

  const needsSetup = !isLoading && profile && !profile.birth_date && !profile.sales_function;

  const layoutConfig: AdaptiveLayoutConfig = useMemo(() => ({
    textSizeClass: 'text-base',
    showGamification: false,
    metricsColumns: 4,
    showBenchmarks: true,
    showProjections: true,
    maxAlerts: 5,
    compactMode: false,
    ...layoutDefaults[ageGroup],
    ...functionDefaults[salesFunction],
  }), [ageGroup, salesFunction]);

  return {
    ageGroup,
    salesFunction,
    layoutConfig,
    needsSetup,
    isLoading,
    profile,
  };
}
