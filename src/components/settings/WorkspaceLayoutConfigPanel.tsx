import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { MenuSection } from '@/types/entity';
import { 
  useWorkspaceLayoutConfig, 
  useUpdateWorkspaceLayoutConfig,
  getDefaultSections,
  EntityType 
} from '@/hooks/useWorkspaceLayoutConfig';

const SECTION_LABELS: Record<MenuSection, string> = {
  'overview': 'Visão Geral',
  'insights': 'Insights IA',
  'timeline': 'Timeline',
  'notes': 'Notas',
  'messages': 'Mensagens',
  'tasks': 'Tarefas',
  'opportunities': 'Oportunidades',
  'proposals': 'Propostas',
  'payments': 'Pagamentos',
  'details': 'Informações',
  'custom-fields': 'Campos Personalizados',
  'history': 'Histórico',
  'contacts': 'Contactos',
  'automations': 'Automações',
  'credit': 'Propostas de Crédito',
  'orders': 'Encomendas B2B',
  'scheduling': 'Agendamentos',
  'student-journey': 'Student Journey',
  'relationships': 'Relações',
  'audit': 'Registo de Alterações',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  lead: 'Leads',
  contact: 'Contactos',
  company: 'Empresas',
};

interface EntityLayoutConfigProps {
  entityType: EntityType;
}

function EntityLayoutConfig({ entityType }: EntityLayoutConfigProps) {
  const { data: config, isLoading } = useWorkspaceLayoutConfig(entityType);
  const updateConfig = useUpdateWorkspaceLayoutConfig();
  const defaultSections = getDefaultSections(entityType);
  
  const [selectedSections, setSelectedSections] = useState<MenuSection[]>(defaultSections);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setSelectedSections(config.visible_sections as MenuSection[]);
    } else {
      setSelectedSections(defaultSections);
    }
    setHasChanges(false);
  }, [config, defaultSections]);

  const handleToggleSection = (section: MenuSection) => {
    setSelectedSections(prev => {
      const newSections = prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section];
      setHasChanges(true);
      return newSections;
    });
  };

  const handleSave = () => {
    updateConfig.mutate({
      entityType,
      visibleSections: selectedSections,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setSelectedSections(defaultSections);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {defaultSections.map((section) => (
          <div
            key={section}
            className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              id={`${entityType}-${section}`}
              checked={selectedSections.includes(section)}
              onCheckedChange={() => handleToggleSection(section)}
            />
            <Label
              htmlFor={`${entityType}-${section}`}
              className="flex-1 cursor-pointer text-sm font-medium"
            >
              {SECTION_LABELS[section]}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Repor Predefinições
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateConfig.isPending}
          className="gap-2"
        >
          {updateConfig.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
}

export function WorkspaceLayoutConfigPanel() {
  const [activeTab, setActiveTab] = useState<EntityType>('lead');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configuração do Menu Lateral
          <Badge variant="secondary" className="font-normal">Por Workspace</Badge>
        </CardTitle>
        <CardDescription>
          Personalize quais secções aparecem no menu lateral das páginas de detalhe para cada tipo de entidade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
          <TabsList className="grid w-full grid-cols-3">
            {(['lead', 'contact', 'company'] as EntityType[]).map((type) => (
              <TabsTrigger key={type} value={type}>
                {ENTITY_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>
          {(['lead', 'contact', 'company'] as EntityType[]).map((type) => (
            <TabsContent key={type} value={type} className="mt-4">
              <EntityLayoutConfig entityType={type} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
