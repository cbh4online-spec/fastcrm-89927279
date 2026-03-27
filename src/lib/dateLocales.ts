import { pt } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { es } from 'date-fns/locale';
import { fr } from 'date-fns/locale';

const localeMap: Record<string, Locale> = { pt, en: enUS, es, fr };

export function getDateLocale(lang: string): Locale {
  return localeMap[lang?.slice(0, 2)] || pt;
}
