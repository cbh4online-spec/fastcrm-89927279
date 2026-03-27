import { Clock, Shield, RefreshCw, Lock, Sparkles, Target, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description: string;
  durationMinutes: number;
  brandColor: string;
  className?: string;
}

export function BookingHeroPanel({ title, description, durationMinutes, brandColor, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {/* Brand accent */}
      <div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: brandColor, boxShadow: `0 8px 32px ${brandColor}50` }}
        >
          <Sparkles className="h-6 w-6 text-white" />
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
            {durationMinutes} minutos
          </div>
        </div>
      </div>

      {/* What to expect */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          O que esperar
        </h3>
        <ul className="space-y-3">
          {[
            { icon: Target, text: 'Análise do seu processo atual e oportunidades' },
            { icon: Lightbulb, text: 'Estratégias personalizadas para o seu negócio' },
            { icon: Sparkles, text: 'Próximos passos claros e acionáveis' },
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

      {/* Trust signals */}
      <div className="space-y-3 pt-2">
        <div className="h-px bg-border/50" />
        <div className="space-y-2.5">
          {[
            { icon: Shield, text: 'Reunião sem compromisso' },
            { icon: RefreshCw, text: 'Pode reagendar a qualquer momento' },
            { icon: Lock, text: 'Os seus dados são usados apenas para esta marcação' },
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
