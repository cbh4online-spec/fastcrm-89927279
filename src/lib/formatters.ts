import i18n from '@/i18n';
import { pt, enUS, es, fr, type Locale } from 'date-fns/locale';
import { format as fnsFormat, formatDistanceToNow as fnsDistanceToNow } from 'date-fns';

const localeMap: Record<string, Locale> = { pt, en: enUS, es, fr };

export function getDateLocale(): Locale {
  return localeMap[i18n.language] || pt;
}

export function formatCurrency(value: number, currency = 'EUR'): string {
  const locale = i18n.language === 'pt' ? 'pt-PT' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

export function formatNumber(value: number): string {
  const locale = i18n.language === 'pt' ? 'pt-PT' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return fnsFormat(d, pattern, { locale: getDateLocale() });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return fnsDistanceToNow(d, { addSuffix: true, locale: getDateLocale() });
}

export function formatPercent(value: number, decimals = 0): string {
  const locale = i18n.language === 'pt' ? 'pt-PT' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value / 100);
}
