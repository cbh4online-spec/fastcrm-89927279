import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageSquare, ShieldCheck } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";
import { format } from "date-fns";

interface ContactPreferencesSectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => void;
  editable?: boolean;
}

export function ContactPreferencesSection({ contact, onFieldChange, editable = true }: ContactPreferencesSectionProps) {
  const prefs = contact.contact_preferences || { email: true, phone: true, whatsapp: true };
  const consent = contact.consent_record || {};

  const togglePref = (key: string) => {
    if (!editable) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    onFieldChange('contact_preferences', updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Preferências & Consentimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel preferences */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Canais de Contacto</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <Switch
                checked={!!prefs.email}
                onCheckedChange={() => togglePref('email')}
                disabled={!editable}
              />
              <span className="text-xs">Email</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <Switch
                checked={!!prefs.phone}
                onCheckedChange={() => togglePref('phone')}
                disabled={!editable}
              />
              <span className="text-xs">Telefone</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <Switch
                checked={!!prefs.whatsapp}
                onCheckedChange={() => togglePref('whatsapp')}
                disabled={!editable}
              />
              <span className="text-xs">WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Marketing opt-in */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Marketing Opt-in</Label>
            {contact.marketing_opt_in && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Consentido
              </Badge>
            )}
          </div>
          <Switch
            checked={!!contact.marketing_opt_in}
            onCheckedChange={(v) => onFieldChange('marketing_opt_in', v)}
            disabled={!editable}
          />
        </div>

        {/* Consent info */}
        {(consent as any).opt_in_at && (
          <div className="text-xs text-muted-foreground pt-1">
            Consentido em: {format(new Date((consent as any).opt_in_at), 'dd/MM/yyyy HH:mm')}
            {(consent as any).source && <> · Fonte: {(consent as any).source}</>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
