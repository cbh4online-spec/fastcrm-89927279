import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";

interface AddressSectionProps {
  contact: ENIContact;
  isEditing: boolean;
  editedData: Partial<ENIContact>;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
}

export function AddressSection({ 
  contact, 
  isEditing, 
  editedData, 
  onFieldChange 
}: AddressSectionProps) {
  const getValue = <K extends keyof ENIContact>(field: K): ENIContact[K] => {
    return isEditing && field in editedData ? editedData[field] as ENIContact[K] : contact[field];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Morada
        </CardTitle>
        <CardDescription>Endereço de contacto e faturação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          {isEditing ? (
            <Input
              id="address"
              value={getValue('address') || ''}
              onChange={(e) => onFieldChange('address', e.target.value)}
              placeholder="Rua, número, andar..."
            />
          ) : (
            <p className="text-sm">{getValue('address') || '—'}</p>
          )}
        </div>

        {/* City & Postal Code */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Localidade</Label>
            {isEditing ? (
              <Input
                id="city"
                value={getValue('city') || ''}
                onChange={(e) => onFieldChange('city', e.target.value)}
                placeholder="Lisboa"
              />
            ) : (
              <p className="text-sm">{getValue('city') || '—'}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">Código Postal</Label>
            {isEditing ? (
              <Input
                id="postal_code"
                value={getValue('postal_code') || ''}
                onChange={(e) => onFieldChange('postal_code', e.target.value)}
                placeholder="1000-001"
              />
            ) : (
              <p className="text-sm">{getValue('postal_code') || '—'}</p>
            )}
          </div>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          {isEditing ? (
            <Input
              id="country"
              value={getValue('country') || 'Portugal'}
              onChange={(e) => onFieldChange('country', e.target.value)}
              placeholder="Portugal"
            />
          ) : (
            <p className="text-sm">{getValue('country') || 'Portugal'}</p>
          )}
        </div>

        {/* Is Fiscal Address */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="is_fiscal_address"
            checked={getValue('is_fiscal_address') !== false}
            onCheckedChange={(checked) => onFieldChange('is_fiscal_address', checked)}
            disabled={!isEditing}
          />
          <Label htmlFor="is_fiscal_address" className="cursor-pointer text-sm">
            Usar como morada fiscal
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
