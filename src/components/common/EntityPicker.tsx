import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, X, Search, Loader2, User, Building2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEntitySearch, SearchableEntity } from '@/hooks/useEntitySearch';

interface EntityPickerProps {
  value: { contactId?: string | null; companyId?: string | null; leadId?: string | null };
  onChange: (value: { contactId?: string | null; companyId?: string | null; leadId?: string | null }) => void;
  placeholder?: string;
  showCompanies?: boolean;
  showContacts?: boolean;
  showLeads?: boolean;
  label?: string;
  className?: string;
}

export function EntityPicker({
  value,
  onChange,
  placeholder = 'Pesquisar cliente...',
  showCompanies = true,
  showContacts = true,
  showLeads = true,
  label,
  className,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<SearchableEntity | null>(null);
  
  const { 
    entities, 
    isLoading, 
    search, 
    getContactById, 
    getCompanyById,
    getLeadById,
  } = useEntitySearch();

  // Load initial entity if value is set
  useEffect(() => {
    const loadInitialEntity = async () => {
      if (value.contactId && !selectedEntity) {
        const contact = await getContactById(value.contactId);
        if (contact) setSelectedEntity(contact);
      } else if (value.companyId && !selectedEntity) {
        const company = await getCompanyById(value.companyId);
        if (company) setSelectedEntity(company);
      } else if (value.leadId && !selectedEntity) {
        const lead = await getLeadById(value.leadId);
        if (lead) setSelectedEntity(lead);
      }
    };
    loadInitialEntity();
  }, [value.contactId, value.companyId, value.leadId, getContactById, getCompanyById, getLeadById, selectedEntity]);

  // Search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  // Load entities on open
  useEffect(() => {
    if (open && entities.length === 0) {
      search('');
    }
  }, [open, entities.length, search]);

  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      if (entity.type === 'contact' && !showContacts) return false;
      if (entity.type === 'company' && !showCompanies) return false;
      if (entity.type === 'lead' && !showLeads) return false;
      return true;
    });
  }, [entities, showContacts, showCompanies, showLeads]);

  const handleSelect = (entity: SearchableEntity) => {
    setSelectedEntity(entity);
    if (entity.type === 'contact') {
      onChange({ contactId: entity.id, companyId: null, leadId: null });
    } else if (entity.type === 'company') {
      onChange({ contactId: null, companyId: entity.id, leadId: null });
    } else {
      onChange({ contactId: null, companyId: null, leadId: entity.id });
    }
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEntity(null);
    onChange({ contactId: null, companyId: null, leadId: null });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getEntityTypeLabel = (type: 'contact' | 'company' | 'lead') => {
    switch (type) {
      case 'contact': return 'Contacto';
      case 'company': return 'Empresa';
      case 'lead': return 'Lead';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !selectedEntity && 'text-muted-foreground'
            )}
          >
            {selectedEntity ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedEntity.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {selectedEntity.type === 'contact' ? (
                      <User className="h-3 w-3" />
                    ) : selectedEntity.type === 'company' ? (
                      <Building2 className="h-3 w-3" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedEntity.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {getEntityTypeLabel(selectedEntity.type)}
                </Badge>
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {selectedEntity && (
                <X
                  className="h-4 w-4 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar contactos, empresas e leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-[280px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? 'Nenhum resultado encontrado' : 'Sem contactos, empresas ou leads'}
              </div>
            ) : (
              <div className="p-1">
                {showContacts && filteredEntities.some(e => e.type === 'contact') && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Contactos
                    </div>
                    {filteredEntities
                      .filter(e => e.type === 'contact')
                      .map(entity => (
                        <EntityItem
                          key={entity.id}
                          entity={entity}
                          isSelected={selectedEntity?.id === entity.id}
                          onSelect={handleSelect}
                          getInitials={getInitials}
                        />
                      ))}
                  </>
                )}
                {showCompanies && filteredEntities.some(e => e.type === 'company') && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                      Empresas
                    </div>
                    {filteredEntities
                      .filter(e => e.type === 'company')
                      .map(entity => (
                        <EntityItem
                          key={entity.id}
                          entity={entity}
                          isSelected={selectedEntity?.id === entity.id}
                          onSelect={handleSelect}
                          getInitials={getInitials}
                        />
                      ))}
                  </>
                )}
                {showLeads && filteredEntities.some(e => e.type === 'lead') && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                      Leads
                    </div>
                    {filteredEntities
                      .filter(e => e.type === 'lead')
                      .map(entity => (
                        <EntityItem
                          key={entity.id}
                          entity={entity}
                          isSelected={selectedEntity?.id === entity.id}
                          onSelect={handleSelect}
                          getInitials={getInitials}
                        />
                      ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
          {selectedEntity && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setSelectedEntity(null);
                  onChange({ contactId: null, companyId: null, leadId: null });
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remover associação
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface EntityItemProps {
  entity: SearchableEntity;
  isSelected: boolean;
  onSelect: (entity: SearchableEntity) => void;
  getInitials: (name: string) => string;
}

function EntityItem({ entity, isSelected, onSelect, getInitials }: EntityItemProps) {
  return (
    <button
      onClick={() => onSelect(entity)}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 text-left rounded-md hover:bg-muted/50 transition-colors',
        isSelected && 'bg-primary/10'
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={entity.avatar_url || ''} />
        <AvatarFallback className="text-xs bg-muted">
          {entity.type === 'contact' ? (
            <User className="h-4 w-4" />
          ) : entity.type === 'company' ? (
            <Building2 className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{entity.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {entity.email || entity.company || entity.website || entity.phone}
        </div>
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
}
