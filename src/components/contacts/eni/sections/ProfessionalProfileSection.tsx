import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building, Calendar, Users } from "lucide-react";
import { ENIContact, BUSINESS_AREAS, FISCAL_REGIMES, CLIENT_TYPES_LABELS } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";

interface ProfessionalProfileSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

export function ProfessionalProfileSection({ 
  contact, 
  onFieldChange,
}: ProfessionalProfileSectionProps) {
  // Only show for ENI entity type
  if (contact.entity_type !== 'eni') {
    return null;
  }

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-card dark:from-amber-950/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10">
            <Briefcase className="h-4 w-4 text-amber-500" />
          </div>
          Perfil Profissional (ENI)
        </CardTitle>
        <CardDescription>Informação profissional associada à atividade do ENI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        {/* CAE Code */}
        <InlineEditableField
          label="Código CAE"
          fieldId="cae_code"
          fieldType="text"
          value={contact.cae_code || ''}
          onChange={(value) => onFieldChange('cae_code', value)}
          placeholder="Código de atividade económica"
        />

        {/* CAE Description */}
        <InlineEditableField
          label="Descrição CAE"
          fieldId="cae_description"
          fieldType="text"
          value={contact.cae_description || ''}
          onChange={(value) => onFieldChange('cae_description', value)}
          placeholder="Descrição da atividade"
        />

        {/* Business Area */}
        <InlineEditableField
          label="Área de Atuação"
          fieldId="business_area"
          fieldType="select"
          value={contact.business_area || ''}
          onChange={(value) => onFieldChange('business_area', value)}
          options={BUSINESS_AREAS}
          icon={<Building className="h-3.5 w-3.5" />}
        />

        {/* Fiscal Regime */}
        <InlineEditableField
          label="Regime Fiscal"
          fieldId="fiscal_regime"
          fieldType="select"
          value={contact.fiscal_regime || ''}
          onChange={(value) => onFieldChange('fiscal_regime', value)}
          options={FISCAL_REGIMES}
        />

        {/* Activity Start Date */}
        <InlineEditableField
          label="Início de Atividade"
          fieldId="activity_start_date"
          fieldType="date"
          value={contact.activity_start_date || ''}
          onChange={(value) => onFieldChange('activity_start_date', value)}
          icon={<Calendar className="h-3.5 w-3.5" />}
        />

        {/* Client Types */}
        <InlineEditableField
          label="Tipo de Clientes"
          fieldId="client_types"
          fieldType="select"
          value={contact.client_types || ''}
          onChange={(value) => onFieldChange('client_types', value)}
          options={Object.keys(CLIENT_TYPES_LABELS)}
          icon={<Users className="h-3.5 w-3.5" />}
        />
      </CardContent>
    </Card>
  );
}
