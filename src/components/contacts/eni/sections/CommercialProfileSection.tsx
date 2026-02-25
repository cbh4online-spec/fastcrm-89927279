import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Calendar, Target, Users, Tag, Percent } from "lucide-react";
import { ENIContact, CLIENT_STATUS_LABELS, ABCCategory } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { cn } from "@/lib/utils";
import { usePriceTiers } from "@/hooks/useClientPricing";
import { useTranslation } from "react-i18next";

interface CommercialProfileSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

const ABC_COLORS: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  B: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  C: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

const LEAD_SOURCES = [
  "Instagram",
  "Facebook",
  "Website",
  "Referência",
  "WhatsApp",
  "Email",
  "Evento",
  "Outro",
];

export function CommercialProfileSection({ 
  contact, 
  onFieldChange,
}: CommercialProfileSectionProps) {
  const { t } = useTranslation('crm');
  const abcCategory = contact.abc_category as ABCCategory;
  const { tiers } = usePriceTiers();

  const currentTier = tiers.find(t => t.id === contact.price_tier_id);
  const activeTiers = tiers.filter(t => t.is_active);

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <ShoppingBag className="h-4 w-4 text-emerald-500" />
            </div>
            {t('commercialProfile')}
          </CardTitle>
          {abcCategory && (
            <Badge 
              variant="outline" 
              className={cn("text-xs font-bold", ABC_COLORS[abcCategory])}
            >
              {t('clientLabel')} {abcCategory}
            </Badge>
          )}
        </div>
        <CardDescription>{t('commercialProfileDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/50">
        <InlineEditableField
          label={t('clientStatus')}
          fieldId="client_status"
          fieldType="select"
          value={contact.client_status || 'ativo'}
          onChange={(value) => onFieldChange('client_status', value)}
          options={Object.keys(CLIENT_STATUS_LABELS)}
          icon={<Target className="h-3.5 w-3.5" />}
        />

        <InlineEditableField
          label={t('clientSince')}
          fieldId="client_since"
          fieldType="date"
          value={contact.client_since || ''}
          onChange={(value) => onFieldChange('client_since', value)}
          icon={<Calendar className="h-3.5 w-3.5" />}
        />

        <InlineEditableField
          label={t('priceTier')}
          fieldId="price_tier_id"
          fieldType="select"
          value={contact.price_tier_id || ''}
          onChange={(value) => onFieldChange('price_tier_id', value || null)}
          options={activeTiers.map(t => t.id)}
          optionLabels={activeTiers.reduce((acc, t) => ({ 
            ...acc, 
            [t.id]: `${t.name}${t.discount_percentage > 0 ? ` (${t.discount_percentage}%)` : ''}` 
          }), {})}
          icon={<Percent className="h-3.5 w-3.5" />}
          placeholder={t('noPriceTier')}
          emptyOption={t('noPriceTier')}
        />

        <InlineEditableField
          label={t('leadSource')}
          fieldId="lead_source"
          fieldType="select"
          value={contact.lead_source || ''}
          onChange={(value) => onFieldChange('lead_source', value)}
          options={LEAD_SOURCES}
          icon={<Users className="h-3.5 w-3.5" />}
        />

        <InlineEditableField
          label={t('tags')}
          fieldId="tags"
          fieldType="tags"
          value={contact.tags || []}
          onChange={(value) => onFieldChange('tags', value)}
          icon={<Tag className="h-3.5 w-3.5" />}
          placeholder="tag1, tag2, tag3"
        />
      </CardContent>
    </Card>
  );
}
