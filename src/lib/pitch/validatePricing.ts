/**
 * Validação de cobertura de preços dos módulos opcionais activos no pitch.
 *
 * Um módulo é considerado "sem preço" quando:
 *  - Não existe entrada em DEFAULT_MODULE_PRICES, OU
 *  - O label de preço não contém qualquer valor numérico em €
 *    (ex.: "—", "Sob consulta", string vazia).
 *
 * Slides core (capa, próximos passos, etc.) são ignorados — só faz sentido
 * validar módulos opcionais, verticais e packs.
 */

import { PITCH_SLIDES, DEFAULT_ENABLED_SLIDE_IDS } from '@/components/pitch/slides';
import { DEFAULT_MODULE_PRICES } from './slideContent';
import type { PitchTokens } from './tokens';

export interface MissingPriceModule {
  id: string;
  title: string;
  category: 'module' | 'vertical' | 'pack';
  reason: 'no-entry' | 'no-amount';
}

const HAS_EUR_AMOUNT = /€\s*\d/;

export function findMissingPrices(tokens: PitchTokens): MissingPriceModule[] {
  const enabled = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
  const overrides = tokens.slideOverrides ?? {};

  const missing: MissingPriceModule[] = [];

  for (const slide of PITCH_SLIDES) {
    if (slide.category === 'core') continue;
    if (!enabled.includes(slide.id)) continue;

    // Override do utilizador tem prioridade sobre o default.
    const override = overrides[slide.id];
    const overridePrice = override?.investmentBadge?.price;
    const defaultPrice = DEFAULT_MODULE_PRICES[slide.id]?.price;
    const effective = overridePrice ?? defaultPrice;

    if (effective === undefined || effective === null) {
      missing.push({
        id: slide.id,
        title: slide.title,
        category: slide.category as MissingPriceModule['category'],
        reason: 'no-entry',
      });
      continue;
    }

    if (typeof effective !== 'string' || !HAS_EUR_AMOUNT.test(effective)) {
      missing.push({
        id: slide.id,
        title: slide.title,
        category: slide.category as MissingPriceModule['category'],
        reason: 'no-amount',
      });
    }
  }

  return missing;
}

export function summarizeMissing(missing: MissingPriceModule[]): string {
  if (missing.length === 0) return '';
  const names = missing.map((m) => m.title);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}
