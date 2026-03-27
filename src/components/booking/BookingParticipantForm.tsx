import { User, Mail, Phone, Building2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CustomField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface Props {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestMessage: string;
  requirePhone: boolean;
  customMessageLabel: string | null;
  customFields: CustomField[];
  customFieldValues: Record<string, string>;
  onGuestName: (v: string) => void;
  onGuestEmail: (v: string) => void;
  onGuestPhone: (v: string) => void;
  onGuestMessage: (v: string) => void;
  onCustomField: (id: string, v: string) => void;
  error?: string | null;
}

function FormField({ icon: Icon, label, required, children }: {
  icon?: React.ElementType;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className={cn('flex items-center gap-2 text-sm font-medium text-foreground/80')}>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

const inputClass = 'h-11 rounded-xl border-border/60 bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50';
const textareaClass = 'rounded-xl border-border/60 bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50';

export function BookingParticipantForm({
  guestName, guestEmail, guestPhone, guestMessage,
  requirePhone, customMessageLabel, customFields, customFieldValues,
  onGuestName, onGuestEmail, onGuestPhone, onGuestMessage, onCustomField,
  error,
}: Props) {
  const { t } = useTranslation('booking');

  return (
    <div className="space-y-4">
      <FormField icon={User} label={t('fullName')} required>
        <Input
          value={guestName}
          onChange={e => onGuestName(e.target.value)}
          placeholder={t('namePlaceholder')}
          className={inputClass}
          autoComplete="name"
        />
      </FormField>

      <FormField icon={Mail} label={t('email')} required>
        <Input
          type="email"
          value={guestEmail}
          onChange={e => onGuestEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className={inputClass}
          autoComplete="email"
        />
      </FormField>

      {requirePhone && (
        <FormField icon={Phone} label={t('phone')} required>
          <Input
            type="tel"
            value={guestPhone}
            onChange={e => onGuestPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            className={inputClass}
            autoComplete="tel"
          />
        </FormField>
      )}

      {customMessageLabel && (
        <FormField icon={MessageSquare} label={customMessageLabel}>
          <Textarea
            value={guestMessage}
            onChange={e => onGuestMessage(e.target.value)}
            rows={3}
            placeholder={t('messagePlaceholder')}
            className={textareaClass}
          />
        </FormField>
      )}

      {customFields.map(field => (
        <FormField key={field.id} label={field.label} required={field.required}>
          {field.type === 'textarea' ? (
            <Textarea
              value={customFieldValues[field.id] || ''}
              onChange={e => onCustomField(field.id, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={3}
              className={textareaClass}
            />
          ) : field.type === 'select' ? (
            <Select
              value={customFieldValues[field.id] || ''}
              onValueChange={v => onCustomField(field.id, v)}
            >
              <SelectTrigger className={cn(inputClass, 'h-11')}>
                <SelectValue placeholder={field.placeholder || t('selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={field.type === 'number' ? 'number' : 'text'}
              value={customFieldValues[field.id] || ''}
              onChange={e => onCustomField(field.id, e.target.value)}
              placeholder={field.placeholder || ''}
              className={inputClass}
            />
          )}
        </FormField>
      ))}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}
    </div>
  );
}
