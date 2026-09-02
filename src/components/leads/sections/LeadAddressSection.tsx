import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Lead } from "@/hooks/useLeads";
import { MapPin, Home, Flag } from "lucide-react";

interface LeadAddressSectionProps {
  lead: Lead;
  onFieldChange: (field: keyof Lead, value: unknown) => Promise<void>;
}

export function LeadAddressSection({ lead, onFieldChange }: LeadAddressSectionProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <MapPin className="w-4 h-4" />
          </div>
          Morada
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          <InlineEditableField
            label="Endereço"
            fieldId="address"
            fieldType="textarea"
            value={lead.address || ""}
            onChange={(value) => onFieldChange("address", value)}
            icon={<Home className="w-4 h-4" />}
            placeholder="Rua, avenida, lugar..."
          />

          <InlineEditableField
            label="Número"
            fieldId="address_number"
            fieldType="text"
            value={lead.address_number || ""}
            onChange={(value) => onFieldChange("address_number", value)}
            placeholder="12"
          />

          <InlineEditableField
            label="Andar"
            fieldId="address_floor"
            fieldType="text"
            value={lead.address_floor || ""}
            onChange={(value) => onFieldChange("address_floor", value)}
            placeholder="3.º Esq."
          />

          <InlineEditableField
            label="Código Postal"
            fieldId="postal_code"
            fieldType="text"
            value={lead.postal_code || ""}
            onChange={(value) => onFieldChange("postal_code", value)}
            placeholder="1000-001"
          />

          <InlineEditableField
            label="Localidade"
            fieldId="city"
            fieldType="text"
            value={lead.city || ""}
            onChange={(value) => onFieldChange("city", value)}
            placeholder="Lisboa"
          />

          <InlineEditableField
            label="Região"
            fieldId="region"
            fieldType="text"
            value={lead.region || ""}
            onChange={(value) => onFieldChange("region", value)}
            placeholder="Lisboa"
          />

          <InlineEditableField
            label="País"
            fieldId="country"
            fieldType="text"
            value={lead.country || ""}
            onChange={(value) => onFieldChange("country", value)}
            icon={<Flag className="w-4 h-4" />}
            placeholder="Portugal"
          />
        </div>
      </CardContent>
    </Card>
  );
}
