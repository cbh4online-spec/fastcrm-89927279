import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay } from 'date-fns';
import { Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { BookingHeroPanel } from '@/components/booking/BookingHeroPanel';
import { BookingStepProgress, type BookingStep } from '@/components/booking/BookingStepProgress';
import { BookingSlotPicker } from '@/components/booking/BookingSlotPicker';
import { BookingParticipantForm } from '@/components/booking/BookingParticipantForm';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';
import { BookingLanguageSelector } from '@/components/booking/BookingLanguageSelector';
import { safePush, isProdEnvironment, getDeviceType } from '@/lib/analyticsHelpers';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/dateLocales';

interface BookingPageData {
  id: string;
  workspace_id: string;
  calendar_id: string;
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  max_advance_days: number;
  is_active: boolean;
  brand_color: string;
  working_days: number[];
  start_hour: string;
  end_hour: string;
  availability_id: string | null;
  require_phone: boolean;
  custom_message_label: string | null;
  custom_fields: { id: string; label: string; type: string; required: boolean; placeholder?: string; options?: string[] }[];
  host_user_ids: string[] | null;
}

interface AvailabilitySlot { day_of_week: number; start_time: string; end_time: string; }
interface AvailabilityException { exception_date: string; is_blocked: boolean; }

const analyticsOpts = { consentAnalytics: true, isProd: undefined as boolean | undefined };

function emitEvent(name: string, data: Record<string, unknown> = {}) {
  safePush(name, { ...data, device_type: getDeviceType() }, { ...analyticsOpts, isProd: isProdEnvironment() });
}

const stepAnim = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.3, ease: 'easeInOut' as const },
};

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('booking');
  const locale = getDateLocale(i18n.language);

  // Apply lang param from URL if present
  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam && ['pt', 'en', 'es', 'fr'].includes(langParam)) {
      i18n.changeLanguage(langParam);
    }
  }, [searchParams, i18n]);

  const [page, setPage] = useState<BookingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>('schedule');

  // Guest info
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [savingLead, setSavingLead] = useState(false);

  // Schedule
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingEvents, setExistingEvents] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Availability
  const [availSlots, setAvailSlots] = useState<AvailabilitySlot[]>([]);
  const [availExceptions, setAvailExceptions] = useState<AvailabilityException[]>([]);
  const [hostAvatarUrl, setHostAvatarUrl] = useState<string | null>(null);
  const [hostName, setHostName] = useState<string | null>(null);

  // Fetch booking page
  useEffect(() => {
    async function fetchPage() {
      if (!slug) return;
      const { data, error: err } = await supabase
        .from('booking_pages' as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (err || !data) {
        setError(t('notFound'));
        setLoading(false);
        return;
      }
      const pageData = data as unknown as BookingPageData;
      setPage(pageData);

      // Fetch host avatar via calendar owner
      const { data: calData } = await supabase
        .from('calendars')
        .select('created_by')
        .eq('id', pageData.calendar_id)
        .maybeSingle();
      if (calData?.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('user_id', calData.created_by)
          .maybeSingle();
        if (profile?.avatar_url) setHostAvatarUrl(profile.avatar_url);
        if (profile?.full_name) setHostName(profile.full_name);
      }

      if (pageData.availability_id) {
        const [slotsRes, exceptionsRes] = await Promise.all([
          supabase.from('availability_slots' as any).select('day_of_week, start_time, end_time').eq('availability_id', pageData.availability_id),
          supabase.from('availability_exceptions' as any).select('exception_date, is_blocked').eq('availability_id', pageData.availability_id),
        ]);
        if (slotsRes.data) setAvailSlots(slotsRes.data as unknown as AvailabilitySlot[]);
        if (exceptionsRes.data) setAvailExceptions(exceptionsRes.data as unknown as AvailabilityException[]);
      }
      setLoading(false);
      emitEvent('booking_page_viewed', { slug: pageData.slug, duration: pageData.duration_minutes });
    }
    fetchPage();
  }, [slug]);

  // Fetch events for selected date — cross-check all host calendars
  useEffect(() => {
    if (!selectedDate || !page) return;
    setLoadingSlots(true);
    async function fetchEvents() {
      const dayStart = startOfDay(selectedDate!);
      const dayEnd = addDays(dayStart, 1);

      const hostIds = page!.host_user_ids;
      if (hostIds && hostIds.length > 0) {
        // Cross-check: find all calendars owned by host users, then fetch events from all
        const { data: hostCalendars } = await supabase
          .from('calendars')
          .select('id')
          .eq('workspace_id', page!.workspace_id)
          .in('created_by', hostIds);

        const calendarIds = (hostCalendars || []).map((c: any) => c.id);
        // Always include the page's primary calendar
        if (!calendarIds.includes(page!.calendar_id)) {
          calendarIds.push(page!.calendar_id);
        }

        const { data } = await supabase
          .from('calendar_events')
          .select('start_time, end_time')
          .in('calendar_id', calendarIds)
          .gte('start_time', dayStart.toISOString())
          .lt('start_time', dayEnd.toISOString());
        setExistingEvents(data || []);
      } else {
        // Single calendar mode
        const { data } = await supabase
          .from('calendar_events')
          .select('start_time, end_time')
          .eq('calendar_id', page!.calendar_id)
          .gte('start_time', dayStart.toISOString())
          .lt('start_time', dayEnd.toISOString());
        setExistingEvents(data || []);
      }
      setLoadingSlots(false);
    }
    fetchEvents();
  }, [selectedDate, page]);

  // Save lead
  const handleSaveLead = async () => {
    if (!page || !guestName || !guestEmail) return;
    if (page.require_phone && !guestPhone) return;
    const customFields = page.custom_fields || [];
    const missingRequired = customFields.some(f => f.required && !customFieldValues[f.id]?.trim());
    if (missingRequired) return;

    setSavingLead(true);
    setError(null);
    emitEvent('booking_details_started');
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/public-booking`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_lead',
          booking_page_id: page.id,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone || null,
          guest_message: guestMessage || null,
          custom_field_values: Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao guardar dados');
      setLeadId(result.lead_id);
      emitEvent('booking_details_completed');
      handleConfirmBookingDirect(result.lead_id);
    } catch (err) {
      setError((err as Error).message);
      setSavingLead(false);
    }
  };

  // Confirm booking (called after lead save)
  const handleConfirmBookingDirect = async (resolvedLeadId: string) => {
    if (!page || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    emitEvent('booking_submitted');
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/public-booking`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_booking',
          booking_page_id: page.id,
          lead_id: resolvedLeadId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedSlot,
          guest_name: guestName,
          guest_email: guestEmail,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao agendar');
      setStep('confirmed');
      emitEvent('booking_completed');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
      setSavingLead(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </motion.div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="p-8 text-center max-w-md border-border/40 shadow-xl rounded-2xl">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold">{error}</p>
        </Card>
      </div>
    );
  }

  if (!page) return null;

  const canProceedToDetails = !!selectedDate && !!selectedSlot;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-3xl pointer-events-none"
        style={{ backgroundColor: page.brand_color }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-3xl pointer-events-none"
        style={{ backgroundColor: page.brand_color }}
      />

      {/* Language selector - top right */}
      <div className="absolute top-4 right-4 z-20">
        <BookingLanguageSelector />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 lg:py-16">
        <div className="grid lg:grid-cols-[1fr,1.2fr] gap-8 lg:gap-16 items-start">

          {/* ── Left: Hero Panel ── */}
          <div className="lg:sticky lg:top-16">
            <BookingHeroPanel
              title={page.title}
              description={page.description}
              durationMinutes={page.duration_minutes}
              brandColor={page.brand_color}
              className="hidden lg:flex"
            />
            {/* Mobile: compact header */}
            <div className="lg:hidden space-y-3">
              <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
              {page.description && <p className="text-sm text-muted-foreground">{page.description}</p>}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                  {page.duration_minutes} {t('min')}
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: Booking Card ── */}
          <div>
            <Card className="rounded-2xl border-border/40 shadow-xl overflow-hidden bg-card/80 backdrop-blur-sm">
              {/* Card header with stepper */}
              <div className="px-6 pt-6 pb-4 border-b border-border/30">
                <BookingStepProgress current={step} brandColor={page.brand_color} />
              </div>

              {/* Card body */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {/* ── Step 1: Schedule ── */}
                  {step === 'schedule' && (
                    <motion.div key="schedule" {...stepAnim}>
                      <BookingSlotPicker
                        page={page}
                        availSlots={availSlots}
                        availExceptions={availExceptions}
                        existingEvents={existingEvents}
                        selectedDate={selectedDate}
                        selectedSlot={selectedSlot}
                        onSelectDate={(d) => {
                          setSelectedDate(d);
                          emitEvent('booking_slot_selected', { date: format(d, 'yyyy-MM-dd') });
                        }}
                        onSelectSlot={(s) => {
                          setSelectedSlot(s);
                          if (s) emitEvent('booking_slot_selected', { slot: s });
                        }}
                        brandColor={page.brand_color}
                        loadingSlots={loadingSlots}
                      />

                      {/* Summary + CTA */}
                      <div className="mt-6 pt-4 border-t border-border/30">
                        {selectedDate && selectedSlot && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-4 p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground"
                          >
                            <span className="font-medium text-foreground">
                              {format(selectedDate, 'EEEE, d MMMM', { locale })}
                            </span>
                            {` ${t('at')} `}
                            <span className="font-medium text-foreground">{selectedSlot}</span>
                            {' · '}{page.duration_minutes} {t('min')}
                          </motion.div>
                        )}
                        <Button
                          className="w-full h-12 rounded-xl text-base font-semibold gap-2 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                          onClick={() => setStep('details')}
                          disabled={!canProceedToDetails}
                          style={{
                            backgroundColor: canProceedToDetails ? page.brand_color : undefined,
                            boxShadow: canProceedToDetails ? `0 4px 20px ${page.brand_color}40` : undefined,
                          }}
                        >
                          {t('continue')}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Step 2: Details ── */}
                  {step === 'details' && (
                    <motion.div key="details" {...stepAnim}>
                      <button
                        onClick={() => setStep('schedule')}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t('changeTime')}
                      </button>

                      {/* Selected slot reminder */}
                      <div className="mb-5 p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {selectedDate && format(selectedDate, 'EEEE, d MMMM', { locale })}
                        </span>
                        {` ${t('at')} `}
                        <span className="font-medium text-foreground">{selectedSlot}</span>
                        {' · '}{page.duration_minutes} {t('min')}
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        {t('yourDetails')}
                      </h3>

                      <BookingParticipantForm
                        guestName={guestName}
                        guestEmail={guestEmail}
                        guestPhone={guestPhone}
                        guestMessage={guestMessage}
                        requirePhone={page.require_phone}
                        customMessageLabel={page.custom_message_label}
                        customFields={page.custom_fields || []}
                        customFieldValues={customFieldValues}
                        onGuestName={setGuestName}
                        onGuestEmail={setGuestEmail}
                        onGuestPhone={setGuestPhone}
                        onGuestMessage={setGuestMessage}
                        onCustomField={(id, v) => setCustomFieldValues(prev => ({ ...prev, [id]: v }))}
                        error={error}
                      />

                      <Button
                        className="w-full h-12 rounded-xl text-base font-semibold gap-2 mt-6 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                        onClick={handleSaveLead}
                        disabled={
                          !guestName || !guestEmail ||
                          (page.require_phone && !guestPhone) ||
                          (page.custom_fields || []).some(f => f.required && !customFieldValues[f.id]?.trim()) ||
                          savingLead || submitting
                        }
                        style={{
                          backgroundColor: page.brand_color,
                          boxShadow: `0 4px 20px ${page.brand_color}40`,
                        }}
                      >
                        {savingLead || submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('confirming')}
                          </>
                        ) : (
                          t('confirmBooking')
                        )}
                      </Button>

                      {/* Trust micro-signals */}
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span>🔒 {t('trustSecure')}</span>
                        <span>📅 {t('trustReschedule')}</span>
                        <span>✨ {t('trustNoCommitment')}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Step 3: Confirmed ── */}
                  {step === 'confirmed' && selectedDate && selectedSlot && (
                    <motion.div key="confirmed" {...stepAnim}>
                      <BookingConfirmation
                        title={page.title}
                        guestName={guestName}
                        guestEmail={guestEmail}
                        selectedDate={selectedDate}
                        selectedSlot={selectedSlot}
                        durationMinutes={page.duration_minutes}
                        brandColor={page.brand_color}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>

            {/* Mobile trust signals */}
            <div className="lg:hidden mt-6 space-y-2 text-center">
              <p className="text-xs text-muted-foreground">🛡️ {t('mobileTrust')}</p>
              <p className="text-xs text-muted-foreground">{t('mobileDataNote')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
