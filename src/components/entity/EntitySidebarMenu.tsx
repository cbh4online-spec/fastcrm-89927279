import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Sparkles,
  Activity,
  StickyNote,
  MessageSquare,
  CheckSquare,
  Target,
  FileText,
  CreditCard,
  Settings2,
  Layers,
  History,
  Users,
  Landmark,
} from 'lucide-react';
import { EntityType, MenuSection } from '@/types/entity';
import { useWorkspaceLayoutConfig, getVisibleSections } from '@/hooks/useWorkspaceLayoutConfig';
import { useWorkspaceModules } from '@/hooks/useWorkspaceModules';

interface EntitySidebarMenuProps {
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
  };
}

interface MenuItem {
  id: MenuSection;
  label: string;
  icon: React.ElementType;
  showFor: EntityType[];
  count?: number;
}

const MENU_SECTIONS: {
  title: string;
  items: MenuItem[];
}[] = [
  {
    title: 'CONTEXTO',
    items: [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, showFor: ['lead', 'contact', 'company'] },
      { id: 'insights', label: 'Insights IA', icon: Sparkles, showFor: ['lead', 'contact', 'company'] },
    ],
  },
  {
    title: 'ATIVIDADE',
    items: [
      { id: 'timeline', label: 'Timeline', icon: Activity, showFor: ['lead', 'contact', 'company'] },
      { id: 'notes', label: 'Notas', icon: StickyNote, showFor: ['lead', 'contact', 'company'] },
      { id: 'messages', label: 'Mensagens', icon: MessageSquare, showFor: ['lead', 'contact', 'company'] },
      { id: 'tasks', label: 'Tarefas', icon: CheckSquare, showFor: ['lead', 'contact', 'company'] },
    ],
  },
  {
    title: 'NEGÓCIO',
    items: [
      { id: 'opportunities', label: 'Oportunidades', icon: Target, showFor: ['lead', 'contact', 'company'] },
      { id: 'proposals', label: 'Propostas', icon: FileText, showFor: ['lead', 'contact', 'company'] },
      { id: 'credit', label: 'Crédito', icon: Landmark, showFor: ['lead', 'contact', 'company'] },
      { id: 'payments', label: 'Pagamentos', icon: CreditCard, showFor: ['contact', 'company'] },
      { id: 'contacts', label: 'Contactos', icon: Users, showFor: ['company'] },
    ],
  },
  {
    title: 'DADOS',
    items: [
      { id: 'details', label: 'Informações', icon: Settings2, showFor: ['lead', 'contact', 'company'] },
      { id: 'custom-fields', label: 'Campos Personalizados', icon: Layers, showFor: ['lead', 'contact', 'company'] },
    ],
  },
];

export function EntitySidebarMenu({
  entityType,
  activeSection,
  onSectionChange,
  counts = {},
}: EntitySidebarMenuProps) {
  const { data: layoutConfig } = useWorkspaceLayoutConfig(entityType);
  const visibleSections = getVisibleSections(entityType, layoutConfig);
  const { isModuleInstalled } = useWorkspaceModules();
  const getCount = (id: MenuSection): number | undefined => {
    switch (id) {
      case 'messages': return counts.messages;
      case 'tasks': return counts.tasks;
      case 'opportunities': return counts.opportunities;
      case 'proposals': return counts.proposals;
      case 'contacts': return counts.contacts;
      case 'credit': return counts.credit;
      default: return undefined;
    }
  };

  const isVisible = (sectionId: MenuSection): boolean => {
    // Credit section is only visible if module is installed
    if (sectionId === 'credit' && !isModuleInstalled('credit-intermediation')) {
      return false;
    }
    return visibleSections.includes(sectionId);
  };

  return (
    <div className="w-56 border-r bg-muted/30 flex-shrink-0">
      <ScrollArea className="h-full">
        <div className="p-3 space-y-1">
          {MENU_SECTIONS.map((section, sectionIndex) => {
            const visibleItems = section.items.filter(
              item => item.showFor.includes(entityType) && isVisible(item.id)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                {sectionIndex > 0 && <Separator className="my-3" />}
                <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider">
                  {section.title}
                </p>
                <div className="space-y-0.5 mt-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const count = getCount(item.id);
                    const isActive = activeSection === item.id;

                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'w-full justify-start gap-2 h-9 px-2 font-normal',
                          isActive && 'bg-background shadow-sm font-medium'
                        )}
                        onClick={() => onSectionChange(item.id)}
                      >
                        <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {count !== undefined && count > 0 && (
                          <Badge 
                            variant={isActive ? 'default' : 'secondary'} 
                            className="h-5 min-w-5 px-1.5 text-xs"
                          >
                            {count}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
