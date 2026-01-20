import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Sparkles, 
  FileText, 
  Settings2, 
  Plus,
  BarChart3,
  Loader2
} from 'lucide-react';
import { EntityAutomationQuickActions } from './EntityAutomationQuickActions';
import { AIEntityAutomationSuggestions } from './AIEntityAutomationSuggestions';
import { useEntityAutomationRules, useEntityAutomationStats } from '@/hooks/useEntityAutomations';
import { getTemplatesByEntityType } from '@/data/entityAutomationTemplates';
import { AutomationRulesList } from './AutomationRulesList';

interface EntityAutomationSectionProps {
  entityType: 'lead' | 'contact' | 'company' | 'opportunity';
  entityId: string;
  entityName: string;
}

export function EntityAutomationSection({
  entityType,
  entityId,
  entityName
}: EntityAutomationSectionProps) {
  const [activeTab, setActiveTab] = useState('quick-actions');
  
  const { data: rules = [], isLoading: rulesLoading } = useEntityAutomationRules(entityType, entityId);
  const { data: stats } = useEntityAutomationStats(entityType, entityId);
  const templates = getTemplatesByEntityType(entityType);

  const entityLabels: Record<string, string> = {
    lead: 'Lead',
    contact: 'Contacto',
    company: 'Empresa',
    opportunity: 'Oportunidade'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Automações - {entityLabels[entityType]}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {stats?.activeRules || 0} automações ativas • {templates.length} templates disponíveis
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Automação
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="quick-actions" className="gap-2">
            <Zap className="w-4 h-4" />
            Ações Rápidas
          </TabsTrigger>
          <TabsTrigger value="ai-suggestions" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Sugestões IA
            {(stats?.pendingSuggestions || 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats?.pendingSuggestions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Templates
            <Badge variant="outline" className="ml-1 h-5 px-1.5">
              {templates.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Ativas
            {rules.filter(r => r.is_active).length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {rules.filter(r => r.is_active).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-actions" className="mt-6">
          <EntityAutomationQuickActions
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
          />
        </TabsContent>

        <TabsContent value="ai-suggestions" className="mt-6">
          <AIEntityAutomationSuggestions
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesGrid 
            entityType={entityType}
            entityId={entityId}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {rulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">
                Nenhuma automação ativa
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Cria uma ação rápida ou instala um template para começar a automatizar
              </p>
              <Button onClick={() => setActiveTab('quick-actions')}>
                Ver Ações Rápidas
              </Button>
            </div>
          ) : (
            <AutomationRulesList
              onEdit={(rule) => console.log('Edit', rule.id)}
              onViewLogs={(ruleId) => console.log('Logs', ruleId)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Templates Grid Component
interface TemplatesGridProps {
  entityType: 'lead' | 'contact' | 'company' | 'opportunity';
  entityId: string;
}

function TemplatesGrid({ entityType, entityId }: TemplatesGridProps) {
  const templates = getTemplatesByEntityType(entityType);
  
  const categoryColors: Record<string, { bg: string; text: string }> = {
    'follow-up': { bg: 'bg-amber-500/10', text: 'text-amber-600' },
    'conversion': { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    'nurturing': { bg: 'bg-blue-500/10', text: 'text-blue-600' },
    'retention': { bg: 'bg-violet-500/10', text: 'text-violet-600' },
    'engagement': { bg: 'bg-pink-500/10', text: 'text-pink-600' },
    'sales': { bg: 'bg-green-500/10', text: 'text-green-600' },
    'onboarding': { bg: 'bg-cyan-500/10', text: 'text-cyan-600' }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((template) => {
        const catColors = categoryColors[template.category] || { bg: 'bg-muted', text: 'text-foreground' };
        
        return (
          <div
            key={template.id}
            className="p-4 rounded-lg border bg-card hover:shadow-sm hover:border-primary/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${catColors.bg} ${catColors.text}`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{template.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>~{Math.round(template.estimatedTimeSaved / 60)}h/sem</span>
                    <span>{template.successRate}% sucesso</span>
                    <span>{template.popularity}% popular</span>
                  </div>
                  <Button size="sm" variant="outline">
                    Instalar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
