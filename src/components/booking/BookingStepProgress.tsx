import { motion } from 'framer-motion';
import { Check, CalendarDays, User, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BookingStep = 'schedule' | 'details' | 'confirmed';

const STEPS: { key: BookingStep; label: string; icon: React.ElementType }[] = [
  { key: 'schedule', label: 'Horário', icon: CalendarDays },
  { key: 'details', label: 'Dados', icon: User },
  { key: 'confirmed', label: 'Confirmado', icon: PartyPopper },
];

const stepIndex = (s: BookingStep) => STEPS.findIndex(x => x.key === s);

interface Props {
  current: BookingStep;
  brandColor: string;
}

export function BookingStepProgress({ current, brandColor }: Props) {
  const currentIdx = stepIndex(current);

  return (
    <div className="flex items-center justify-between w-full max-w-xs mx-auto">
      {STEPS.map((s, i) => {
        const done = currentIdx > i;
        const active = currentIdx === i;
        const Icon = done ? Check : s.icon;

        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.1 : 1,
                  backgroundColor: done || active ? brandColor : 'hsl(var(--muted))',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-shadow',
                  (done || active) && 'shadow-lg',
                )}
                style={(done || active) ? { boxShadow: `0 0 20px ${brandColor}40` } : undefined}
              >
                <Icon className={cn('h-4 w-4', done || active ? 'text-white' : 'text-muted-foreground')} />
              </motion.div>
              <span className={cn(
                'text-[11px] font-medium tracking-wide',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 rounded-full bg-muted overflow-hidden self-start mt-[18px]">
                <motion.div
                  initial={false}
                  animate={{ scaleX: currentIdx > i ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="h-full origin-left rounded-full"
                  style={{ backgroundColor: brandColor }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
