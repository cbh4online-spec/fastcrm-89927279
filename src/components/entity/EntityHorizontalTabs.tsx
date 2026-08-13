import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EntityType, MenuSection } from '@/types/entity';
import { useWorkspaceLayoutConfig, getVisibleSections } from '@/hooks/useWorkspaceLayoutConfig';
import { useWorkspaceModules } from '@/hooks/useWorkspaceModules';

interface TabItem {
  id: MenuSection;
  label: string;
  showFor: EntityType[];
}

const ALL_TABS: TabItem[] = [
  { id: 'overview', label: 'Visão Geral', showFor: ['lead', 'contact', 'company'] },
  { id: 'insights', label: 'Insights IA', showFor: ['lead', 'contact', 'company'] },
  { id: 'timeline', label: 'Timeline', showFor: ['lead', 'contact', 'company'] },
  { id: 'notes', label: 'Notas', showFor: ['lead', 'contact', 'company'] },
  { id: 'communication', label: 'Comunicação', showFor: ['lead', 'contact', 'company'] },
  { id: 'activity', label: 'Atividade', showFor: ['lead', 'contact', 'company'] },
  { id: 'team', label: 'Equipa', showFor: ['lead', 'contact', 'company'] },
  { id: 'files', label: 'Ficheiros', showFor: ['lead', 'contact', 'company'] },
  { id: 'business', label: 'Negócios', showFor: ['lead', 'contact', 'company'] },
  { id: 'financial', label: 'Financeiro', showFor: ['contact', 'company'] },
  { id: 'financing', label: 'Financiamento', showFor: ['company'] },
  { id: 'relationships', label: 'Relações', showFor: ['contact', 'company'] },
  { id: 'data', label: 'Dados', showFor: ['lead', 'contact', 'company'] },
  { id: 'contacts', label: 'Contactos', showFor: ['company'] },
  { id: 'support', label: 'Suporte', showFor: ['contact', 'company'] },
  { id: 'student-journey', label: 'Student Journey', showFor: ['contact'] },
];

type GroupId = 'overview' | 'activity' | 'communication' | 'business' | 'intelligence';

const GROUPS: { id: GroupId; label: string; sections: MenuSection[] }[] = [
  { id: 'overview', label: 'Visão Geral', sections: ['overview', 'contacts', 'relationships'] },
  { id: 'activity', label: 'Atividade', sections: ['timeline', 'activity', 'notes', 'files', 'team'] },
  { id: 'communication', label: 'Comunicação', sections: ['communication', 'support', 'student-journey'] },
  { id: 'business', label: 'Negócio', sections: ['business', 'financial', 'financing'] },
  { id: 'intelligence', label: 'IA & Dados', sections: ['insights', 'data'] },
];

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
    files?: number;
    notes?: number;
    relationships?: number;
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
    if (sectionId === 'student-journey') return isModuleInstalled('student-journey') || hasStudentJourneyProfile;
    return visibleSections.includes(sectionId);
  };

  const tabById = new Map(ALL_TABS.map((tab) => [tab.id, tab]));
  const getCount = (id: MenuSection): number | undefined => counts[id as keyof typeof counts];

  const groups = GROUPS.map((group) => ({
    ...group,
    tabs: group.sections
      .map((id) => tabById.get(id))
      .filter((tab): tab is TabItem => !!tab && tab.showFor.includes(entityType) && isVisible(tab.id)),
  })).filter((group) => group.tabs.length > 0);

  const activeGroup =
    groups.find((group) => group.tabs.some((tab) => tab.id === activeSection)) ?? groups[0];

  const groupCount = (tabs: TabItem[]) =>
    tabs.reduce((sum, tab) => sum + (getCount(tab.id) ?? 0), 0);

  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-1 overflow-x-auto px-2 sm:px-6 -mb-px">
        {groups.map((group) => {
          const isActive = activeGroup?.id === group.id;
          const total = groupCount(group.tabs);
          return (
            <button
              key={group.id}
              onClick={() => {
                if (!group.tabs.some((tab) => tab.id === activeSection)) {
                  onSectionChange(group.tabs[0].id);
                }
              }}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <span>{group.label}</span>
              {total > 0 && (
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="h-5 min-w-5 rounded-full px-1.5 text-xs"
                >
                  {total}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {activeGroup && activeGroup.tabs.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto border-t bg-muted/30 px-2 py-1.5 sm:px-6">
          {activeGroup.tabs.map((tab) => {
            const isActive = activeSection === tab.id;
            const count = getCount(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => onSectionChange(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
