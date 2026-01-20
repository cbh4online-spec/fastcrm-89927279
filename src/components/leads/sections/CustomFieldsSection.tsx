import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Button } from "@/components/ui/button";
import { Layers, Plus, Settings } from "lucide-react";
import { 
  useCustomFields, 
  useCustomFieldValues, 
  useSetCustomFieldValue,
  CustomField 
} from "@/hooks/useCustomFields";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface CustomFieldsSectionProps {
  leadId: string;
}

export function CustomFieldsSection({ leadId }: CustomFieldsSectionProps) {
  const { data: customFields = [], isLoading: isLoadingFields } = useCustomFields("lead");
  const { data: fieldValues = [], isLoading: isLoadingValues } = useCustomFieldValues(leadId);
  const setFieldValue = useSetCustomFieldValue();

  const isLoading = isLoadingFields || isLoadingValues;

  // Get value for a specific field
  const getFieldValue = (fieldId: string): unknown => {
    const valueRecord = fieldValues.find(v => v.custom_field_id === fieldId);
    return valueRecord?.value ?? null;
  };

  // Handle field change
  const handleFieldChange = async (field: CustomField, value: unknown) => {
    try {
      await setFieldValue.mutateAsync({
        customFieldId: field.id,
        entityId: leadId,
        value,
        fieldName: field.name,
        isUnique: field.is_unique,
      });
      toast.success(`${field.name} atualizado`);
    } catch (error) {
      // Error is already handled by the mutation
      console.error("Error updating custom field:", error);
    }
  };

  // Map field type to InlineEditableField format
  const mapFieldType = (fieldType: string): "text" | "number" | "date" | "boolean" | "select" => {
    switch (fieldType) {
      case "number":
        return "number";
      case "date":
        return "date";
      case "boolean":
        return "boolean";
      case "select":
        return "select";
      default:
        return "text";
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <Layers className="h-4 w-4 text-violet-600" />
            </div>
            Campos Personalizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customFields.length === 0) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-500/10">
                <Layers className="h-4 w-4 text-violet-600" />
              </div>
              Campos Personalizados
            </CardTitle>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/dashboard/settings/fields">
                <Plus className="h-4 w-4" />
                Criar Campo
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Ainda não existem campos personalizados para leads.
            </p>
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link to="/dashboard/settings/fields">
                <Settings className="h-4 w-4" />
                Gerir Campos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <Layers className="h-4 w-4 text-violet-600" />
            </div>
            Campos Personalizados
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Link to="/dashboard/settings/fields">
              <Settings className="h-4 w-4" />
              Gerir
            </Link>
          </Button>
        </div>
        <CardDescription>
          Campos definidos pelo workspace para capturar informação adicional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        {customFields.map((field) => (
          <InlineEditableField
            key={field.id}
            label={field.name}
            fieldId={field.id}
            fieldType={mapFieldType(field.field_type)}
            value={getFieldValue(field.id)}
            onChange={(value) => handleFieldChange(field, value)}
            options={field.options}
            required={field.required}
          />
        ))}
      </CardContent>
    </Card>
  );
}
