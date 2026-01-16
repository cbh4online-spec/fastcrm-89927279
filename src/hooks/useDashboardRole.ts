import { useMemo } from 'react';
import { useWorkspace, WorkspaceRole } from '@/contexts/WorkspaceContext';
import { useUserRole } from './useUserRole';

export type DashboardRole = 'comercial' | 'gestor' | 'suporte' | 'admin';

interface DashboardRoleConfig {
  role: DashboardRole;
  label: string;
  description: string;
  icon: string;
}

const roleConfigs: Record<DashboardRole, DashboardRoleConfig> = {
  comercial: {
    role: 'comercial',
    label: 'Comercial',
    description: 'Foco em vendas, leads e oportunidades',
    icon: 'TrendingUp',
  },
  gestor: {
    role: 'gestor',
    label: 'Gestor',
    description: 'Visão de equipa e pipeline agregado',
    icon: 'Users',
  },
  suporte: {
    role: 'suporte',
    label: 'Suporte',
    description: 'Inbox, tickets e atendimento ao cliente',
    icon: 'HeadphonesIcon',
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    description: 'Visão estratégica e financeira',
    icon: 'BarChart3',
  },
};

/**
 * Maps workspace role and user role to dashboard role
 * - owner/admin -> gestor (can switch to admin)
 * - agent -> comercial (can switch to suporte)
 * - viewer -> comercial (read-only)
 * - super_admin -> admin (full access)
 */
function mapToDashboardRole(workspaceRole: WorkspaceRole, isSuperAdmin: boolean, isAdmin: boolean): DashboardRole {
  if (isSuperAdmin || isAdmin) {
    return 'admin';
  }

  switch (workspaceRole) {
    case 'owner':
    case 'admin':
      return 'gestor';
    case 'agent':
      return 'comercial';
    case 'agency':
      return 'gestor';
    case 'viewer':
    default:
      return 'comercial';
  }
}

/**
 * Returns available dashboard roles for the current user
 */
function getAvailableRoles(workspaceRole: WorkspaceRole, isSuperAdmin: boolean, isAdmin: boolean): DashboardRole[] {
  if (isSuperAdmin || isAdmin) {
    return ['admin', 'gestor', 'comercial', 'suporte'];
  }

  switch (workspaceRole) {
    case 'owner':
      return ['gestor', 'comercial', 'suporte', 'admin'];
    case 'admin':
      return ['gestor', 'comercial', 'suporte'];
    case 'agent':
      return ['comercial', 'suporte'];
    case 'agency':
      return ['gestor', 'comercial'];
    case 'viewer':
    default:
      return ['comercial'];
  }
}

export function useDashboardRole() {
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const { isAdmin } = useUserRole();
  
  const workspaceRole = currentWorkspace?.role || 'viewer';

  const defaultRole = useMemo(() => 
    mapToDashboardRole(workspaceRole, isSuperAdmin, isAdmin),
    [workspaceRole, isSuperAdmin, isAdmin]
  );

  const availableRoles = useMemo(() => 
    getAvailableRoles(workspaceRole, isSuperAdmin, isAdmin),
    [workspaceRole, isSuperAdmin, isAdmin]
  );

  const roleConfig = useMemo(() => 
    roleConfigs[defaultRole],
    [defaultRole]
  );

  const allConfigs = roleConfigs;

  return {
    defaultRole,
    availableRoles,
    roleConfig,
    allConfigs,
    canSwitchRole: availableRoles.length > 1,
  };
}
