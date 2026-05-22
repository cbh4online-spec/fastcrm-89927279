import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
import { useIsMobile } from '@/hooks/use-mobile';

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

const MOBILE_PRIMARY_TABS: MenuSection[] = [
  'overview',
  'insights',
  'timeline',
  'notes',
  'communication',
];

const MOBILE_TAB_LABELS: Partial<Record<MenuSection, string>> = {
  overview: 'Geral',
  insights: 'IA',
  timeline: 'Timeline',
  notes: 'Notas',
  communication: 'Com.',
  activity: 'Ativ.',
  team: 'Equipa',
  files: 'Fich.',
  business: 'Neg.',
  financial: 'Fin.',
  relationships: 'Relaç.',
  data: 'Dados',
  contacts: 'Cont.',
  support: 'Suporte',
  'student-journey': 'Jornada',
};

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
  const isMobile = useIsMobile();

  const isVisible = (sectionId: MenuSection): boolean => {
    if (sectionId === 'student-journey') return isModuleInstalled('student-journey') || hasStudentJourneyProfile;
    return visibleSections.includes(sectionId);
  };

  const filteredTabs = ALL_TABS.filter(
    (tab) => tab.showFor.includes(entityType) && isVisible(tab.id)
  );

  const getCount = (id: MenuSection): number | undefined => counts[id as keyof typeof counts];
  const getTabLabel = (tab: TabItem) => (isMobile ? MOBILE_TAB_LABELS[tab.id] ?? tab.label : tab.label);

  const activeTab = filteredTabs.find((tab) => tab.id === activeSection);
  const baseMobileTabs = filteredTabs
    .filter((tab) => MOBILE_PRIMARY_TABS.includes(tab.id))
    .slice(0, MOBILE_PRIMARY_TABS.length);

  const visibleTabs = isMobile
    ? activeTab && !baseMobileTabs.some((tab) => tab.id === activeTab.id)
      ? [...baseMobileTabs.slice(0, Math.max(baseMobileTabs.length - 1, 0)), activeTab]
      : baseMobileTabs
    : filteredTabs;

  const overflowTabs = isMobile
    ? filteredTabs.filter((tab) => !visibleTabs.some((visibleTab) => visibleTab.id === tab.id))
    : [];

  return (
    <div className="border-b bg-background px-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 -mb-px">
        {visibleTabs.map((tab) => {
          const count = getCount(tab.id);
          const isActive = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <span>{getTabLabel(tab)}</span>
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
              <button className="flex shrink-0 items-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent whitespace-nowrap transition-colors">
                Mais
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {overflowTabs.map((tab) => {
                const count = getCount(tab.id);
                return (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => onSectionChange(tab.id)}
                    className={cn(activeSection === tab.id && 'bg-accent')}
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
