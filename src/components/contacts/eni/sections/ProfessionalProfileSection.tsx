import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Calendar } from "lucide-react";
import { ENIContact, BUSINESS_AREAS, FISCAL_REGIMES, CLIENT_TYPES_LABELS, ClientTypes } from "../ENIContactTypes";

interface ProfessionalProfileSectionProps {
  contact: ENIContact;
  isEditing: boolean;
  editedData: Partial<ENIContact>;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
}

export function ProfessionalProfileSection({ 
  contact, 
  isEditing, 
  editedData, 
  onFieldChange 
}: ProfessionalProfileSectionProps) {
  const getValue = <K extends keyof ENIContact>(field: K): ENIContact[K] => {
    return isEditing && field in editedData ? editedData[field] as ENIContact[K] : contact[field];
  };

  // Only show for ENI
  const entityType = getValue('entity_type');
  if (entityType !== 'eni') {
    return null;
  }

  return (
    <Card className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-amber-600" />
          Perfil Profissional (ENI)
        </CardTitle>
        <CardDescription>Informação profissional associada à atividade do ENI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CAE */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cae_code">Código CAE</Label>
            {isEditing ? (
              <Input
                id="cae_code"
                value={getValue('cae_code') || ''}
                onChange={(e) => onFieldChange('cae_code', e.target.value)}
                placeholder="ex: 85591"
              />
            ) : (
              <p className="text-sm font-mono">{getValue('cae_code') || '—'}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cae_description">Descrição CAE</Label>
            {isEditing ? (
              <Input
                id="cae_description"
                value={getValue('cae_description') || ''}
                onChange={(e) => onFieldChange('cae_description', e.target.value)}
                placeholder="Outras atividades educativas"
              />
            ) : (
              <p className="text-sm">{getValue('cae_description') || '—'}</p>
            )}
          </div>
        </div>

        {/* Business Area */}
        <div className="space-y-2">
          <Label htmlFor="business_area">Área de Atuação</Label>
          {isEditing ? (
            <Select
              value={getValue('business_area') || ''}
              onValueChange={(value) => onFieldChange('business_area', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">{getValue('business_area') || '—'}</p>
          )}
        </div>

        {/* Fiscal Regime */}
        <div className="space-y-2">
          <Label htmlFor="fiscal_regime">Regime Fiscal</Label>
          {isEditing ? (
            <Select
              value={getValue('fiscal_regime') || ''}
              onValueChange={(value) => onFieldChange('fiscal_regime', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o regime" />
              </SelectTrigger>
              <SelectContent>
                {FISCAL_REGIMES.map((regime) => (
                  <SelectItem key={regime} value={regime}>{regime}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">{getValue('fiscal_regime') || '—'}</p>
          )}
        </div>

        {/* Activity Start Date */}
        <div className="space-y-2">
          <Label htmlFor="activity_start_date" className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Início de Atividade
          </Label>
          {isEditing ? (
            <Input
              id="activity_start_date"
              type="date"
              value={getValue('activity_start_date') || ''}
              onChange={(e) => onFieldChange('activity_start_date', e.target.value)}
            />
          ) : (
            <p className="text-sm">
              {getValue('activity_start_date') 
                ? new Date(getValue('activity_start_date') as string).toLocaleDateString('pt-PT')
                : '—'}
            </p>
          )}
        </div>

        {/* Client Types */}
        <div className="space-y-2">
          <Label htmlFor="client_types">Tipo de Clientes</Label>
          {isEditing ? (
            <Select
              value={getValue('client_types') || 'ambos'}
              onValueChange={(value) => onFieldChange('client_types', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLIENT_TYPES_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">
              {CLIENT_TYPES_LABELS[getValue('client_types') as ClientTypes] || 'Ambos'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
