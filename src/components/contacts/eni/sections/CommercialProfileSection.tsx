import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { ENIContact, CLIENT_STATUS_LABELS, ClientStatus, ABCCategory } from "../ENIContactTypes";
import { cn } from "@/lib/utils";

interface CommercialProfileSectionProps {
  contact: ENIContact;
  isEditing: boolean;
  editedData: Partial<ENIContact>;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
}

const ABC_COLORS: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  C: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
};

const LEAD_SOURCES = [
  'Website',
  'Referência',
  'Redes Sociais',
  'Evento',
  'Publicidade',
  'Parceiro',
  'Cold Call',
  'Email Marketing',
  'Outro',
];

export function CommercialProfileSection({ 
  contact, 
  isEditing, 
  editedData, 
  onFieldChange 
}: CommercialProfileSectionProps) {
  const getValue = <K extends keyof ENIContact>(field: K): ENIContact[K] => {
    return isEditing && field in editedData ? editedData[field] as ENIContact[K] : contact[field];
  };

  const abcCategory = getValue('abc_category') as ABCCategory;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Perfil Comercial
        </CardTitle>
        <CardDescription>Informação comercial e status do cliente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Status */}
        <div className="space-y-2">
          <Label htmlFor="client_status">Status do Cliente</Label>
          {isEditing ? (
            <Select
              value={getValue('client_status') || 'ativo'}
              onValueChange={(value) => onFieldChange('client_status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary"
                className={cn(
                  getValue('client_status') === 'ativo' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
                  getValue('client_status') === 'inativo' && 'bg-gray-100 text-gray-700 dark:bg-gray-800/50',
                  getValue('client_status') === 'sem_compras' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                )}
              >
                {CLIENT_STATUS_LABELS[getValue('client_status') as ClientStatus] || 'Ativo'}
              </Badge>
            </div>
          )}
        </div>

        {/* Client Since */}
        <div className="space-y-2">
          <Label htmlFor="client_since" className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Cliente Desde
          </Label>
          {isEditing ? (
            <Input
              id="client_since"
              type="date"
              value={getValue('client_since') || ''}
              onChange={(e) => onFieldChange('client_since', e.target.value)}
            />
          ) : (
            <p className="text-sm">
              {getValue('client_since') 
                ? new Date(getValue('client_since') as string).toLocaleDateString('pt-PT')
                : '—'}
            </p>
          )}
        </div>

        {/* ABC Category (Read-only, auto-calculated) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5" />
            Categoria ABC
            <Badge variant="outline" className="text-xs font-normal">automático</Badge>
          </Label>
          <div className="flex items-center gap-2">
            {abcCategory ? (
              <Badge className={cn('text-sm font-semibold', ABC_COLORS[abcCategory])}>
                Categoria {abcCategory}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Sem classificação</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Calculado automaticamente com base no volume de vendas.
          </p>
        </div>

        {/* Lead Source */}
        <div className="space-y-2">
          <Label htmlFor="lead_source">Fonte do Lead</Label>
          {isEditing ? (
            <Select
              value={getValue('lead_source') || getValue('source') || ''}
              onValueChange={(value) => onFieldChange('lead_source', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fonte" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">{getValue('lead_source') || getValue('source') || '—'}</p>
          )}
        </div>

        {/* Owner / Assigned To */}
        <div className="space-y-2">
          <Label htmlFor="assigned_to">Responsável (Owner)</Label>
          {isEditing ? (
            <Input
              id="assigned_to"
              value={getValue('assigned_to') || ''}
              onChange={(e) => onFieldChange('assigned_to', e.target.value)}
              placeholder="Nome do responsável"
            />
          ) : (
            <p className="text-sm">{getValue('assigned_to') || '—'}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
