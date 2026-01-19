import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineEditableField } from '@/components/custom-fields/InlineEditableField';
import { Layers } from 'lucide-react';
import { ProfileCustomField, PROFILE_SPECIFIC_FIELDS, ActivityProfileType } from '@/types/activityProfile';
import { useActivityProfileContext } from '@/contexts/ActivityProfileContext';

interface ProfileCustomFieldsSectionProps {
  entityType: 'contact' | 'company';
  profileType?: ActivityProfileType;
  values: Record<string, unknown>;
  onFieldChange: (fieldName: string, value: unknown) => Promise<void>;
}

export function ProfileCustomFieldsSection({
  entityType,
  profileType,
  values,
  onFieldChange,
}: ProfileCustomFieldsSectionProps) {
  const { currentEntityProfile, defaultProfile } = useActivityProfileContext();
  
  // Use context profile or fallback to provided profileType
  const activeProfile = currentEntityProfile || defaultProfile;
  const activeProfileType = activeProfile?.profile_type || profileType;
  
  if (!activeProfileType || activeProfileType === 'generico') {
    return null;
  }

  const customFields = PROFILE_SPECIFIC_FIELDS[activeProfileType] || [];
  
  // Filter fields by entity type
  const entityFields = customFields.filter(field => 
    field.entity_types.includes(entityType)
  );

  if (entityFields.length === 0) {
    return null;
  }

  const getFieldOptions = (field: ProfileCustomField): string[] | undefined => {
    if (field.type === 'select' && field.options) {
      return field.options;
    }
    return undefined;
  };

  const getFieldValue = (field: ProfileCustomField): unknown => {
    const value = values[field.name];
    if (value !== undefined) return value;
    return field.default_value || '';
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <Layers className="h-4 w-4 text-violet-600" />
            </div>
            Campos do Perfil
          </CardTitle>
        </div>
        <CardDescription>
          Campos específicos para {activeProfile?.name || 'este perfil de atividade'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        {entityFields.map((field) => (
          <InlineEditableField
            key={field.name}
            label={field.label}
            fieldId={field.name}
            fieldType={field.type === 'select' ? 'select' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'boolean' ? 'boolean' : 'text'}
            value={getFieldValue(field)}
            onChange={(value) => onFieldChange(field.name, value)}
            options={getFieldOptions(field)}
            required={field.required}
          />
        ))}
      </CardContent>
    </Card>
  );
}
