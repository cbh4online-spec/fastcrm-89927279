import { PITCH_SLIDES, type PitchSlideMeta } from '@/components/pitch/slides';

export interface SlideOrderIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  slideId?: string;
}

/**
 * Valida a integridade do array PITCH_SLIDES — fonte única de verdade do deck.
 * Detecta IDs duplicados, slides obrigatórios em falta, componentes inválidos,
 * e ordem inesperada de categorias (core deve preceder module/vertical/pack).
 */
export function validateSlideOrder(slides: PitchSlideMeta[] = PITCH_SLIDES): SlideOrderIssue[] {
  const issues: SlideOrderIssue[] = [];

  // 1. IDs duplicados
  const seen = new Map<string, number>();
  slides.forEach((s, i) => {
    if (seen.has(s.id)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-id',
        slideId: s.id,
        message: `ID duplicado "${s.id}" nas posições ${seen.get(s.id)! + 1} e ${i + 1}.`,
      });
    } else {
      seen.set(s.id, i);
    }
  });

  // 2. Componente em falta ou inválido
  slides.forEach((s, i) => {
    if (typeof s.component !== 'function') {
      issues.push({
        severity: 'error',
        code: 'invalid-component',
        slideId: s.id,
        message: `Slide #${i + 1} ("${s.title}") não tem componente válido.`,
      });
    }
    if (!s.title?.trim()) {
      issues.push({
        severity: 'warning',
        code: 'missing-title',
        slideId: s.id,
        message: `Slide #${i + 1} (id "${s.id}") sem título definido.`,
      });
    }
  });

  // 3. Slides obrigatórios — capa primeiro, "next"/"cta" no fim do bloco core
  const requiredIds = slides.filter((s) => s.required).map((s) => s.id);
  if (requiredIds.length > 0) {
    const firstRequired = slides.findIndex((s) => s.required);
    if (firstRequired !== 0 && slides[0]?.id !== 'cover') {
      issues.push({
        severity: 'warning',
        code: 'cover-not-first',
        message: 'A capa (slide obrigatório) não está em primeiro lugar.',
      });
    }
  }

  // 4. Ordem de categorias: core deve aparecer antes de module/vertical/pack
  const categoryOrder = ['core', 'module', 'vertical', 'pack'] as const;
  let lastCategoryIdx = -1;
  let lastSlideForCategory = '';
  slides.forEach((s) => {
    const idx = categoryOrder.indexOf(s.category as (typeof categoryOrder)[number]);
    if (idx === -1) {
      issues.push({
        severity: 'warning',
        code: 'unknown-category',
        slideId: s.id,
        message: `Slide "${s.title}" tem categoria desconhecida "${s.category}".`,
      });
      return;
    }
    if (idx < lastCategoryIdx) {
      issues.push({
        severity: 'warning',
        code: 'category-out-of-order',
        slideId: s.id,
        message: `"${s.title}" (${s.category}) aparece depois de "${lastSlideForCategory}" (categoria de ordem superior).`,
      });
    }
    if (idx >= lastCategoryIdx) {
      lastCategoryIdx = idx;
      lastSlideForCategory = s.title;
    }
  });

  return issues;
}

export const CATEGORY_LABEL: Record<string, string> = {
  core: 'Core',
  module: 'Módulo',
  vertical: 'Vertical',
  pack: 'Pack',
};

export const CATEGORY_COLOR: Record<string, string> = {
  core: 'bg-primary/15 text-primary border-primary/30',
  module: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  vertical: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  pack: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
};
