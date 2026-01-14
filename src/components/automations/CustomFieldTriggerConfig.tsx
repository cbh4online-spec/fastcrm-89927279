import { FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCustomFields, CustomField, CustomFieldEntityType } from "@/hooks/useCustomFields";
import { Control } from "react-hook-form";

interface CustomFieldTriggerConfigProps {
  control: Control<any>;
  name: string;
}

const ENTITY_LABELS: Record<CustomFieldEntityType, string> = {
  lead: "Lead",
  opportunity: "Oportunidade",
  contact: "Contacto",
  company: "Empresa",
};

export function CustomFieldTriggerConfig({ control, name }: CustomFieldTriggerConfigProps) {
  const { data: leadFields } = useCustomFields("lead");
  const { data: opportunityFields } = useCustomFields("opportunity");
  const { data: contactFields } = useCustomFields("contact");
  const { data: companyFields } = useCustomFields("company");

  const allCustomFields: { field: CustomField; entityType: CustomFieldEntityType }[] = [
    ...(leadFields || []).map((f) => ({ field: f, entityType: "lead" as const })),
    ...(opportunityFields || []).map((f) => ({ field: f, entityType: "opportunity" as const })),
    ...(contactFields || []).map((f) => ({ field: f, entityType: "contact" as const })),
    ...(companyFields || []).map((f) => ({ field: f, entityType: "company" as const })),
  ];

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Campo Personalizado Específico (opcional)</FormLabel>
          <FormDescription className="text-xs">
            Selecione um campo específico ou deixe vazio para reagir a qualquer campo personalizado.
          </FormDescription>
          <Select onValueChange={field.onChange} value={field.value || "__any__"}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer campo personalizado" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="__any__">
                Qualquer campo personalizado
              </SelectItem>
              {allCustomFields.map(({ field: cf, entityType }) => (
                <SelectItem key={cf.id} value={cf.id}>
                  <div className="flex items-center gap-2">
                    <span>{cf.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {ENTITY_LABELS[entityType]}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {cf.field_type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}
