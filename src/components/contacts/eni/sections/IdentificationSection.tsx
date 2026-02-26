import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, FileText, MessageSquare, Search, Cake } from "lucide-react";
import { ENIContact, EntityType, ENTITY_TYPE_LABELS } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { InlineNifField } from "@/components/custom-fields/InlineNifField";
import { NifLookupResult } from "@/hooks/useNifLookup";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface IdentificationSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
  onNifDataReceived?: (data: NifLookupResult) => void;
}

export function IdentificationSection({ 
  contact, 
  onFieldChange,
  onNifDataReceived,
}: IdentificationSectionProps) {
  const { t } = useTranslation('crm');
  const { t: tc } = useTranslation('common');
  const entityType = (contact.entity_type || 'consumidor_final') as EntityType;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            {t('identification')}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium",
              entityType === 'eni' && "bg-amber-500/10 text-amber-600 border-amber-500/30",
              entityType === 'empresa' && "bg-blue-500/10 text-blue-600 border-blue-500/30",
              entityType === 'consumidor_final' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
            )}
          >
            {ENTITY_TYPE_LABELS[entityType]}
          </Badge>
        </div>
        <CardDescription>{t('identificationDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        {/* Entity Type */}
        <InlineEditableField
          label={t('entityType')}
          fieldId="entity_type"
          fieldType="select"
          value={contact.entity_type || 'consumidor_final'}
          onChange={(value) => onFieldChange('entity_type', value)}
          options={Object.keys(ENTITY_TYPE_LABELS)}
          required
        />

        {/* Name */}
        <InlineEditableField
          label={t('fullName')}
          fieldId="name"
          fieldType="text"
          value={contact.name}
          onChange={(value) => onFieldChange('name', value)}
          icon={<User className="h-3.5 w-3.5" />}
          required
        />

        {/* Nº Cliente */}
        {(contact as any).company_id ? (
          <div className="flex items-start py-3 border-b border-border/50 last:border-0 group">
            <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              {t('clientNumber')}
            </div>
            <div className="flex-1 text-sm flex items-center gap-2">
              <span className="text-foreground">
                {(contact as any).client_number || "—"}
              </span>
              <span className="text-xs text-muted-foreground italic">
                ({tc('inheritedFromCompany')})
              </span>
            </div>
          </div>
        ) : (
          <InlineEditableField
            label={t('clientNumber')}
            fieldId="client_number"
            fieldType="text"
            value={(contact as any).client_number || ''}
            onChange={(value) => onFieldChange('client_number' as keyof ENIContact, value)}
            icon={<FileText className="h-3.5 w-3.5" />}
            placeholder="Ex: CLI-00001"
          />
        )}

        {/* NIF with lookup */}
        <InlineNifField
          label={t('nif')}
          value={contact.tax_id}
          onChange={async (value) => {
            await onFieldChange('tax_id', value);
          }}
          onDataReceived={onNifDataReceived}
          icon={<FileText className="h-3.5 w-3.5" />}
          placeholder={t('enterNif')}
        />

        {/* Commercial Name */}
        <InlineEditableField
          label={t('commercialName')}
          fieldId="commercial_name"
          fieldType="text"
          value={contact.commercial_name || ''}
          onChange={(value) => onFieldChange('commercial_name', value)}
          placeholder={t('commercialNamePlaceholder')}
        />

        {/* Email */}
        <InlineEditableField
          label={t('mainEmail')}
          fieldId="email"
          fieldType="email"
          value={contact.email || ''}
          onChange={(value) => onFieldChange('email', value)}
          icon={<Mail className="h-3.5 w-3.5" />}
          isLink={!!contact.email}
          linkType="email"
        />

        {/* Phone */}
        <InlineEditableField
          label={t('mobile')}
          fieldId="phone"
          fieldType="phone"
          value={contact.phone || ''}
          onChange={(value) => onFieldChange('phone', value)}
          icon={<Phone className="h-3.5 w-3.5" />}
          isLink={!!contact.phone}
          linkType="phone"
        />

        {/* WhatsApp */}
        <InlineEditableField
          label={t('hasWhatsapp')}
          fieldId="has_whatsapp"
          fieldType="boolean"
          value={contact.has_whatsapp || false}
          onChange={(value) => onFieldChange('has_whatsapp', value)}
          icon={<MessageSquare className="h-3.5 w-3.5 text-green-600" />}
        />

        {contact.has_whatsapp && (
          <InlineEditableField
            label={t('whatsappNumber')}
            fieldId="whatsapp_number"
            fieldType="phone"
            value={contact.whatsapp_number || contact.phone || ''}
            onChange={(value) => onFieldChange('whatsapp_number', value)}
            placeholder={t('whatsappNumber')}
          />
        )}

        {/* Birth Date */}
        <InlineEditableField
          label={t('birthDate')}
          fieldId="birth_date"
          fieldType="date"
          value={contact.birth_date || ''}
          onChange={(value) => onFieldChange('birth_date', value)}
          icon={<Cake className="h-3.5 w-3.5" />}
        />
      </CardContent>
    </Card>
  );
}
