import { Clock, Shield, RefreshCw, Lock, Sparkles, Target, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Props {
  title: string;
  description: string;
  durationMinutes: number;
  brandColor: string;
  hostAvatarUrl?: string | null;
  hostName?: string | null;
  className?: string;
}

export function BookingHeroPanel({ title, description, durationMinutes, brandColor, hostAvatarUrl, hostName, className }: Props) {
  const { t } = useTranslation('booking');

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div>
        {/* Host avatar or brand icon */}
        <div className="flex items-center gap-4 mb-5">
          {hostAvatarUrl ? (
            <img
              src={hostAvatarUrl}
              alt={hostName || ''}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-border/30 shadow-lg"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: brandColor, boxShadow: `0 8px 32px ${brandColor}50` }}
            >
              {hostName ? (
                <span className="text-xl font-bold text-white">{hostName.charAt(0).toUpperCase()}</span>
              ) : (
                <Sparkles className="h-6 w-6 text-white" />
              )}
            </div>
          )}
          {hostName && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{hostName}</p>
            </div>
          )}
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-md">
            {description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 text-sm font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {durationMinutes} {t('minutes')}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('whatToExpect')}
        </h3>
        <ul className="space-y-3">
          {[
            { icon: Target, text: t('expectAnalysis') },
            { icon: Lightbulb, text: t('expectStrategies') },
            { icon: Sparkles, text: t('expectNextSteps') },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${brandColor}18` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: brandColor }} />
              </div>
              <span className="text-sm text-foreground/80">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 pt-2">
        <div className="h-px bg-border/50" />
        <div className="space-y-2.5">
          {[
            { icon: Shield, text: t('noCommitment') },
            { icon: RefreshCw, text: t('canReschedule') },
            { icon: Lock, text: t('dataPrivacy') },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
