import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Home, Flag } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { useTranslation } from "react-i18next";

interface AddressSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

export function AddressSection({ 
  contact, 
  onFieldChange,
}: AddressSectionProps) {
  const { t } = useTranslation('crm');

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-orange-500/10">
            <MapPin className="h-4 w-4 text-orange-500" />
          </div>
          {t('addressSection')}
        </CardTitle>
        <CardDescription>{t('addressDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        <InlineEditableField
          label={t('streetAddress')}
          fieldId="address"
          fieldType="textarea"
          value={contact.address || ''}
          onChange={(value) => onFieldChange('address', value)}
          icon={<Home className="h-3.5 w-3.5" />}
          placeholder={t('streetAddressPlaceholder')}
        />

        <InlineEditableField
          label={t('locality')}
          fieldId="city"
          fieldType="text"
          value={contact.city || ''}
          onChange={(value) => onFieldChange('city', value)}
          placeholder={t('localityPlaceholder')}
        />

        <InlineEditableField
          label={t('postalCode')}
          fieldId="postal_code"
          fieldType="text"
          value={contact.postal_code || ''}
          onChange={(value) => onFieldChange('postal_code', value)}
          placeholder={t('postalCodePlaceholder')}
        />

        <InlineEditableField
          label={t('country')}
          fieldId="country"
          fieldType="text"
          value={contact.country || 'Portugal'}
          onChange={(value) => onFieldChange('country', value)}
          icon={<Flag className="h-3.5 w-3.5" />}
        />

        <InlineEditableField
          label={t('fiscalAddress')}
          fieldId="is_fiscal_address"
          fieldType="boolean"
          value={contact.is_fiscal_address ?? true}
          onChange={(value) => onFieldChange('is_fiscal_address', value)}
        />
      </CardContent>
    </Card>
  );
}
