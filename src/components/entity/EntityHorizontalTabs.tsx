import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityType, MenuSection } from '@/types/entity';
import { useWorkspaceLayoutConfig, getVisibleSections } from '@/hooks/useWorkspaceLayoutConfig';
import { useWorkspaceModules } from '@/hooks/useWorkspaceModules';

interface TabItem {
  id: MenuSection;
  label: string;
  showFor: EntityType[];
  count?: number;
}

const ALL_TABS: TabItem[] = [
  { id: 'overview', label: 'Visão Geral', showFor: ['lead', 'contact', 'company'] },
  { id: 'insights', label: 'Insights IA', showFor: ['lead', 'contact', 'company'] },
  { id: 'timeline', label: 'Timeline', showFor: ['lead', 'contact', 'company'] },
  { id: 'notes', label: 'Notas', showFor: ['lead', 'contact', 'company'] },
  { id: 'messages', label: 'Mensagens', showFor: ['lead', 'contact', 'company'] },
  { id: 'tasks', label: 'Tarefas', showFor: ['lead', 'contact', 'company'] },
  { id: 'opportunities', label: 'Oportunidades', showFor: ['lead', 'contact', 'company'] },
  { id: 'proposals', label: 'Propostas', showFor: ['lead', 'contact', 'company'] },
  { id: 'scheduling', label: 'Agendamentos', showFor: ['lead', 'contact', 'company'] },
  { id: 'contacts', label: 'Contactos', showFor: ['company'] },
  { id: 'history', label: 'Histórico', showFor: ['contact', 'company'] },
  { id: 'payments', label: 'Pagamentos', showFor: ['contact', 'company'] },
  { id: 'orders', label: 'Encomendas', showFor: ['contact', 'company'] },
  { id: 'details', label: 'Informações', showFor: ['lead', 'contact', 'company'] },
  { id: 'custom-fields', label: 'Campos', showFor: ['lead', 'contact', 'company'] },
  { id: 'relationships', label: 'Relações', showFor: ['company', 'contact'] },
  { id: 'automations', label: 'Automações', showFor: ['lead', 'contact', 'company'] },
  { id: 'credit', label: 'Crédito', showFor: ['lead', 'contact', 'company'] },
  { id: 'student-journey', label: 'Student Journey', showFor: ['contact'] },
  { id: 'audit', label: 'Auditoria', showFor: ['contact', 'company'] },
];

const MAX_VISIBLE_TABS = 8;

interface EntityHorizontalTabsProps {
  entityType: EntityType;
  activeSection: MenuSection;
  onSectionChange: (section: MenuSection) => void;
  counts?: {
    messages?: number;
    tasks?: number;
    opportunities?: number;
    proposals?: number;
    contacts?: number;
    credit?: number;
    orders?: number;
    scheduling?: number;
  };
  hasStudentJourneyProfile?: boolean;
}

export function EntityHorizontalTabs({
  entityType,
  activeSection,
  onSectionChange,
  counts = {},
  hasStudentJourneyProfile = false,
}: EntityHorizontalTabsProps) {
  const { data: layoutConfig } = useWorkspaceLayoutConfig(entityType);
  const visibleSections = getVisibleSections(entityType, layoutConfig);
  const { isModuleInstalled } = useWorkspaceModules();

  const isVisible = (sectionId: MenuSection): boolean => {
    if (sectionId === 'credit' && !isModuleInstalled('credit-intermediation')) return false;
    if (sectionId === 'student-journey') return isModuleInstalled('student-journey') || hasStudentJourneyProfile;
    return visibleSections.includes(sectionId);
  };

  const filteredTabs = ALL_TABS.filter(
    tab => tab.showFor.includes(entityType) && isVisible(tab.id)
  );

  const visibleTabs = filteredTabs.slice(0, MAX_VISIBLE_TABS);
  const overflowTabs = filteredTabs.slice(MAX_VISIBLE_TABS);

  const getCount = (id: MenuSection): number | undefined => counts[id as keyof typeof counts];

  return (
    <div className="border-b bg-background px-6">
      <div className="flex items-center gap-1 -mb-px overflow-x-auto">
        {visibleTabs.map((tab) => {
          const count = getCount(tab.id);
          const isActive = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="h-5 min-w-5 px-1.5 text-xs rounded-full"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}

        {overflowTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent whitespace-nowrap">
                +{overflowTabs.length} mais
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {overflowTabs.map((tab) => {
                const count = getCount(tab.id);
                return (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => onSectionChange(tab.id)}
                    className={cn(
                      activeSection === tab.id && 'bg-accent'
                    )}
                  >
                    <span className="flex-1">{tab.label}</span>
                    {count !== undefined && count > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                        {count}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
