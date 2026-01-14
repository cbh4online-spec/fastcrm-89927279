import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  renderTemplate,
  validateTemplate,
  VariableContext,
  getExampleContext,
} from '@/lib/templateVariables';
import { useLeads } from '@/hooks/useLeads';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/contexts/AuthContext';
import {
  Monitor,
  Smartphone,
  User,
  Target,
  Building2,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateRealDataPreviewProps {
  content: string;
  subject?: string;
  type: 'email' | 'whatsapp' | 'instagram_dm' | 'proposal' | 'sms';
  compatibleModules?: string[];
}

type EntityType = 'example' | 'lead' | 'opportunity' | 'company' | 'contact';

export function TemplateRealDataPreview({
  content,
  subject,
  type,
  compatibleModules = [],
}: TemplateRealDataPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [entityType, setEntityType] = useState<EntityType>('example');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: opportunities = [], isLoading: oppsLoading } = useOpportunities();
  const { companies = [], isLoading: companiesLoading } = useCompanies();
  const { contacts = [], isLoading: contactsLoading } = useContacts();
  
  // Build context based on selected entity
  const context: VariableContext = React.useMemo(() => {
    if (entityType === 'example') {
      return getExampleContext();
    }
    
    const baseContext: VariableContext = {
      user: user ? {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilizador',
        email: user.email,
      } : null,
    };
    
    if (entityType === 'lead' && selectedEntityId) {
      const lead = leads.find(l => l.id === selectedEntityId);
      if (lead) {
        baseContext.lead = {
          id: lead.id,
          name: lead.name,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          status: lead.status,
          source: lead.source || undefined,
          created_at: lead.created_at,
        };
      }
    }
    
    if (entityType === 'opportunity' && selectedEntityId) {
      const opp = opportunities.find(o => o.id === selectedEntityId);
      if (opp) {
        baseContext.opportunity = {
          id: opp.id,
          title: opp.title,
          value: opp.value || undefined,
          stage: (opp as any).stage?.name || '',
          expected_close_date: opp.expected_close_date || undefined,
          notes: opp.notes || undefined,
          status: opp.status,
        };
        // Also get linked lead if available
        if ((opp as any).lead) {
          const lead = (opp as any).lead;
          baseContext.lead = {
            id: lead.id,
            name: lead.name,
            email: lead.email || undefined,
            phone: lead.phone || undefined,
            status: lead.status,
            source: lead.source || undefined,
          };
        }
      }
    }
    
    if (entityType === 'company' && selectedEntityId) {
      const company = companies.find(c => c.id === selectedEntityId);
      if (company) {
        baseContext.company = {
          id: company.id,
          name: company.name,
          email: company.email || undefined,
          phone: company.phone || undefined,
          website: company.website || undefined,
          industry: company.industry || undefined,
          size: company.size || undefined,
          address: company.address || undefined,
        };
      }
    }
    
    if (entityType === 'contact' && selectedEntityId) {
      const contact = contacts.find(c => c.id === selectedEntityId);
      if (contact) {
        baseContext.contact = {
          id: contact.id,
          name: contact.name,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          job_title: contact.job_title || undefined,
          company: contact.company || undefined,
        };
      }
    }
    
    return baseContext;
  }, [entityType, selectedEntityId, leads, opportunities, companies, contacts, user]);
  
  // Validate and render
  const validation = validateTemplate(content, context);
  const renderedContent = renderTemplate(content, context);
  const renderedSubject = subject ? renderTemplate(subject, context) : undefined;
  
  // Get entities list based on type
  const entities = React.useMemo(() => {
    switch (entityType) {
      case 'lead':
        return leads.map(l => ({ id: l.id, label: l.name }));
      case 'opportunity':
        return opportunities.map(o => ({ id: o.id, label: o.title }));
      case 'company':
        return companies.map(c => ({ id: c.id, label: c.name }));
      case 'contact':
        return contacts.map(c => ({ id: c.id, label: c.name }));
      default:
        return [];
    }
  }, [entityType, leads, opportunities, companies, contacts]);
  
  const isLoading = leadsLoading || oppsLoading || companiesLoading || contactsLoading;
  
  // Determine available entity types based on compatible modules
  const availableEntityTypes: { value: EntityType; label: string; icon: React.ElementType }[] = [
    { value: 'example', label: 'Dados de Exemplo', icon: RefreshCw },
  ];
  
  if (compatibleModules.includes('lead') || compatibleModules.includes('inbox')) {
    availableEntityTypes.push({ value: 'lead', label: 'Lead Real', icon: User });
  }
  if (compatibleModules.includes('opportunity')) {
    availableEntityTypes.push({ value: 'opportunity', label: 'Oportunidade Real', icon: Target });
  }
  if (compatibleModules.includes('company')) {
    availableEntityTypes.push({ value: 'company', label: 'Empresa Real', icon: Building2 });
  }
  if (compatibleModules.includes('contact')) {
    availableEntityTypes.push({ value: 'contact', label: 'Contacto Real', icon: Users });
  }
  
  const renderPreviewContent = () => {
    if (type === 'email') {
      return (
        <div className="bg-background rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Assunto:</span>
              <span className="font-medium">{renderedSubject || 'Sem assunto'}</span>
            </div>
          </div>
          <div className="p-4 whitespace-pre-wrap text-sm">
            {renderedContent || <span className="text-muted-foreground italic">Conteúdo vazio</span>}
          </div>
        </div>
      );
    }
    
    if (type === 'whatsapp') {
      return (
        <div className="bg-[#e5ddd5] rounded-lg p-4 min-h-[200px]">
          <div className="bg-white rounded-lg p-3 shadow-sm max-w-[80%] ml-auto">
            <p className="text-sm whitespace-pre-wrap">{renderedContent}</p>
            <div className="text-[10px] text-muted-foreground text-right mt-1">
              {new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      );
    }
    
    if (type === 'instagram_dm') {
      return (
        <div className="bg-background rounded-lg border overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 px-4 py-2">
            <span className="text-white font-medium text-sm">Direct</span>
          </div>
          <div className="p-4 min-h-[200px]">
            <div className="bg-primary/10 rounded-2xl rounded-bl-sm p-3 max-w-[80%]">
              <p className="text-sm whitespace-pre-wrap">{renderedContent}</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (type === 'sms') {
      return (
        <div className="bg-muted rounded-lg p-4 min-h-[150px]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm p-3 max-w-[80%] ml-auto">
            <p className="text-sm whitespace-pre-wrap">{renderedContent}</p>
          </div>
          <div className="text-xs text-muted-foreground text-right mt-2">
            {renderedContent.length}/160 caracteres
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-background rounded-lg shadow-sm border p-6">
        <p className="whitespace-pre-wrap text-sm">{renderedContent}</p>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v as EntityType);
                setSelectedEntityId(null);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecionar dados" />
              </SelectTrigger>
              <SelectContent>
                {availableEntityTypes.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    <div className="flex items-center gap-2">
                      <et.icon className="h-4 w-4" />
                      {et.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {entityType !== 'example' && (
              <Select
                value={selectedEntityId || ''}
                onValueChange={setSelectedEntityId}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar registo..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : entities.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Sem registos
                    </div>
                  ) : (
                    entities.slice(0, 20).map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={device === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={device === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Validation Status */}
        {validation.unresolvedVariables.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-md">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {validation.unresolvedVariables.length} variável(eis) sem valor: {' '}
              {validation.unresolvedVariables.slice(0, 3).map(v => v.replace(/\{\{|\}\}/g, '')).join(', ')}
              {validation.unresolvedVariables.length > 3 && ` +${validation.unresolvedVariables.length - 3} mais`}
            </span>
          </div>
        )}
        
        {validation.unresolvedVariables.length === 0 && entityType !== 'example' && selectedEntityId && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-md">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Todas as variáveis resolvidas com dados reais</span>
          </div>
        )}
      </div>
      
      {/* Preview */}
      <ScrollArea className="flex-1 p-6 bg-muted/30">
        <div className="flex justify-center">
          <div
            className={cn(
              'transition-all w-full',
              device === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'
            )}
          >
            <div className="mb-3 text-center">
              <Badge variant="outline" className="text-xs">
                {entityType === 'example'
                  ? 'Dados de exemplo'
                  : selectedEntityId
                  ? 'Dados reais'
                  : 'Seleciona um registo'}
              </Badge>
            </div>
            {renderPreviewContent()}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
