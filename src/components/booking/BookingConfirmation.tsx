import { motion } from 'framer-motion';
import { CheckCircle2, CalendarPlus, Clock, User, Mail, ExternalLink, RefreshCw, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/dateLocales';

interface Props {
  title: string;
  guestName: string;
  guestEmail: string;
  selectedDate: Date;
  selectedSlot: string;
  durationMinutes: number;
  brandColor: string;
}

function generateGoogleCalendarUrl(title: string, date: Date, time: string, durationMin: number) {
  const [h, m] = time.split(':').map(Number);
  const start = new Date(date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}`;
}

function generateOutlookUrl(title: string, date: Date, time: string, durationMin: number) {
  const [h, m] = time.split(':').map(Number);
  const start = new Date(date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${start.toISOString()}&enddt=${end.toISOString()}`;
}

export function BookingConfirmation({
  title, guestName, guestEmail, selectedDate, selectedSlot, durationMinutes, brandColor,
}: Props) {
  const { t, i18n } = useTranslation('booking');
  const locale = getDateLocale(i18n.language);
  const googleUrl = generateGoogleCalendarUrl(title, selectedDate, selectedSlot, durationMinutes);
  const outlookUrl = generateOutlookUrl(title, selectedDate, selectedSlot, durationMinutes);

  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${brandColor}18` }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <CheckCircle2 className="h-10 w-10" style={{ color: brandColor }} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground">
          {t('meetingConfirmed')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('confirmationMessage', { name: guestName.split(' ')[0] })}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-muted/50 rounded-2xl p-5 text-left space-y-3 border border-border/40"
      >
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <CalendarPlus className="h-4 w-4 shrink-0" />
            <span>{format(selectedDate, 'EEEE, d MMMM yyyy', { locale })}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{selectedSlot} · {durationMinutes} {t('minutes')}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span>{guestName}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{guestEmail}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-11 gap-2"
          onClick={() => window.open(googleUrl, '_blank')}
        >
          <CalendarPlus className="h-4 w-4" />
          Google Calendar
          <ExternalLink className="h-3 w-3 opacity-50" />
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-11 gap-2"
          onClick={() => window.open(outlookUrl, '_blank')}
        >
          <CalendarPlus className="h-4 w-4" />
          Outlook
          <ExternalLink className="h-3 w-3 opacity-50" />
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="space-y-2 pt-2"
      >
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          <span>{t('rescheduleHint')}</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <MessageCircle className="h-3 w-3" />
          <span>{t('questionsHint')}</span>
        </div>
      </motion.div>
    </div>
  );
}
