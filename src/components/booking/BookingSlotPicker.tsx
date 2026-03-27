import { useState, useMemo } from 'react';
import { format, addDays, startOfDay, isBefore, isAfter, parseISO, addMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/dateLocales';

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityException {
  exception_date: string;
  is_blocked: boolean;
}

interface TimeSlot {
  time: string;
  label: string;
}

interface Props {
  page: {
    duration_minutes: number;
    buffer_minutes: number;
    max_advance_days: number;
    working_days: number[];
    start_hour: string;
    end_hour: string;
    availability_id: string | null;
  };
  availSlots: AvailabilitySlot[];
  availExceptions: AvailabilityException[];
  existingEvents: { start_time: string; end_time: string }[];
  selectedDate: Date | null;
  selectedSlot: string | null;
  onSelectDate: (d: Date) => void;
  onSelectSlot: (s: string) => void;
  brandColor: string;
  loadingSlots?: boolean;
}

export function BookingSlotPicker({
  page, availSlots, availExceptions, existingEvents,
  selectedDate, selectedSlot, onSelectDate, onSelectSlot,
  brandColor, loadingSlots,
}: Props) {
  const { t, i18n } = useTranslation('booking');
  const locale = getDateLocale(i18n.language);
  const [weekOffset, setWeekOffset] = useState(0);

  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    const blockedDates = new Set(
      availExceptions.filter(e => e.is_blocked).map(e => e.exception_date)
    );
    for (let i = 1; i <= page.max_advance_days; i++) {
      const d = addDays(today, i);
      const dow = d.getDay();
      if (!page.working_days.includes(dow)) continue;
      const dateStr = format(d, 'yyyy-MM-dd');
      if (blockedDates.has(dateStr)) continue;
      if (page.availability_id && availSlots.length > 0) {
        if (!availSlots.some(s => s.day_of_week === dow)) continue;
      }
      dates.push(d);
    }
    return dates;
  }, [page, availSlots, availExceptions]);

  const DATES_PER_PAGE = 7;
  const visibleDates = availableDates.slice(
    weekOffset * DATES_PER_PAGE,
    (weekOffset + 1) * DATES_PER_PAGE
  );
  const maxOffset = Math.max(0, Math.ceil(availableDates.length / DATES_PER_PAGE) - 1);

  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedDate) return [];
    const slots: TimeSlot[] = [];
    const duration = page.duration_minutes;
    const buffer = page.buffer_minutes;
    const step = duration + buffer;
    const dow = selectedDate.getDay();

    let ranges: { start: string; end: string }[] = [];
    if (page.availability_id && availSlots.length > 0) {
      ranges = availSlots
        .filter(s => s.day_of_week === dow)
        .map(s => ({ start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) }));
    } else {
      ranges = [{ start: page.start_hour, end: page.end_hour }];
    }

    for (const range of ranges) {
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);
      const rangeStartMin = startH * 60 + startM;
      const rangeEndMin = endH * 60 + endM;

      for (let min = rangeStartMin; min + duration <= rangeEndMin; min += step) {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(Math.floor(min / 60), min % 60, 0, 0);
        const slotEnd = addMinutes(slotStart, duration);

        const hasConflict = existingEvents.some(ev => {
          const evStart = parseISO(ev.start_time);
          const evEnd = parseISO(ev.end_time);
          return isBefore(slotStart, evEnd) && isAfter(slotEnd, evStart);
        });

        if (!hasConflict && isAfter(slotStart, new Date())) {
          const timeStr = format(slotStart, 'HH:mm');
          slots.push({ time: timeStr, label: timeStr });
        }
      }
    }
    return slots;
  }, [page, selectedDate, existingEvents, availSlots]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {t('chooseDay')}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(Math.min(maxOffset, weekOffset + 1))}
              disabled={weekOffset >= maxOffset}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          <AnimatePresence mode="popLayout">
            {visibleDates.map(date => {
              const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <motion.button
                  key={date.toISOString()}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => { onSelectDate(date); onSelectSlot(''); }}
                  className={cn(
                    'relative flex flex-col items-center py-3 px-1 rounded-xl text-center transition-all duration-200 border',
                    isSelected
                      ? 'border-transparent text-white shadow-lg'
                      : 'border-transparent hover:bg-muted/80 hover:border-border/50',
                  )}
                  style={isSelected ? {
                    backgroundColor: brandColor,
                    boxShadow: `0 4px 20px ${brandColor}40`,
                  } : undefined}
                >
                  <span className={cn(
                    'text-[10px] uppercase font-medium tracking-wider',
                    isSelected ? 'text-white/80' : 'text-muted-foreground',
                  )}>
                    {format(date, 'EEE', { locale })}
                  </span>
                  <span className={cn(
                    'text-lg font-bold mt-0.5',
                    !isSelected && 'text-foreground',
                  )}>
                    {format(date, 'd')}
                  </span>
                  <span className={cn(
                    'text-[10px]',
                    isSelected ? 'text-white/70' : 'text-muted-foreground',
                  )}>
                    {format(date, 'MMM', { locale })}
                  </span>
                  {isToday && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: brandColor }} />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={format(selectedDate, 'yyyy-MM-dd')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              {format(selectedDate, 'd MMMM', { locale })}
            </h3>

            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 rounded-xl" />
                ))}
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t('noSlotsTitle')}</p>
                <p className="text-xs mt-1">{t('noSlotsHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(slot => {
                  const isActive = selectedSlot === slot.time;
                  return (
                    <motion.button
                      key={slot.time}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSelectSlot(slot.time)}
                      className={cn(
                        'py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border',
                        isActive
                          ? 'border-transparent text-white shadow-md'
                          : 'border-border/60 text-foreground hover:border-transparent hover:shadow-sm',
                      )}
                      style={isActive ? {
                        backgroundColor: brandColor,
                        boxShadow: `0 4px 16px ${brandColor}40`,
                      } : undefined}
                    >
                      {slot.label}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
