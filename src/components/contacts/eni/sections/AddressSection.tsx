import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Home, Flag } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";

interface AddressSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

export function AddressSection({ 
  contact, 
  onFieldChange,
}: AddressSectionProps) {
  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-orange-500/10">
            <MapPin className="h-4 w-4 text-orange-500" />
          </div>
          Morada
        </CardTitle>
        <CardDescription>Endereço e localização do cliente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        {/* Address */}
        <InlineEditableField
          label="Endereço"
          fieldId="address"
          fieldType="textarea"
          value={contact.address || ''}
          onChange={(value) => onFieldChange('address', value)}
          icon={<Home className="h-3.5 w-3.5" />}
          placeholder="Rua, número, andar..."
        />

        {/* City */}
        <InlineEditableField
          label="Localidade"
          fieldId="city"
          fieldType="text"
          value={contact.city || ''}
          onChange={(value) => onFieldChange('city', value)}
          placeholder="Cidade ou vila"
        />

        {/* Postal Code */}
        <InlineEditableField
          label="Código Postal"
          fieldId="postal_code"
          fieldType="text"
          value={contact.postal_code || ''}
          onChange={(value) => onFieldChange('postal_code', value)}
          placeholder="0000-000"
        />

        {/* Country */}
        <InlineEditableField
          label="País"
          fieldId="country"
          fieldType="text"
          value={contact.country || 'Portugal'}
          onChange={(value) => onFieldChange('country', value)}
          icon={<Flag className="h-3.5 w-3.5" />}
        />

        {/* Fiscal Address Toggle */}
        <InlineEditableField
          label="Morada Fiscal"
          fieldId="is_fiscal_address"
          fieldType="boolean"
          value={contact.is_fiscal_address ?? true}
          onChange={(value) => onFieldChange('is_fiscal_address', value)}
        />
      </CardContent>
    </Card>
  );
}
