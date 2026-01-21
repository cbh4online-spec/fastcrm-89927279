// =============================================
// AI QUALITY SCORE CALCULATOR
// =============================================

import type { SEOContent } from '../types';

export interface QualityScoreBreakdown {
  totalScore: number;
  factors: QualityFactor[];
  suggestions: string[];
}

export interface QualityFactor {
  name: string;
  score: number;
  maxScore: number;
  description: string;
  status: 'excellent' | 'good' | 'warning' | 'poor';
}

interface ScoreParams {
  title: string;
  metaDescription: string | null;
  h1: string | null;
  tldr: string | null;
  content: SEOContent;
  schemaMarkup: Record<string, unknown> | null;
}

/**
 * Calculates a dynamic AI Quality Score based on SEO best practices
 * Returns a score between 0 and 1, plus detailed breakdown
 */
export function calculateQualityScore(params: ScoreParams): QualityScoreBreakdown {
  const factors: QualityFactor[] = [];
  const suggestions: string[] = [];

  // 1. Title Quality (max 15 points)
  const titleScore = evaluateTitle(params.title);
  factors.push(titleScore.factor);
  if (titleScore.suggestion) suggestions.push(titleScore.suggestion);

  // 2. Meta Description (max 15 points)
  const metaScore = evaluateMetaDescription(params.metaDescription);
  factors.push(metaScore.factor);
  if (metaScore.suggestion) suggestions.push(metaScore.suggestion);

  // 3. H1 Tag (max 10 points)
  const h1Score = evaluateH1(params.h1, params.title);
  factors.push(h1Score.factor);
  if (h1Score.suggestion) suggestions.push(h1Score.suggestion);

  // 4. Content Length & Structure (max 20 points)
  const contentScore = evaluateContent(params.content);
  factors.push(contentScore.factor);
  if (contentScore.suggestion) suggestions.push(contentScore.suggestion);

  // 5. FAQs (max 15 points)
  const faqScore = evaluateFAQs(params.content.faqs);
  factors.push(faqScore.factor);
  if (faqScore.suggestion) suggestions.push(faqScore.suggestion);

  // 6. Schema Markup (max 10 points)
  const schemaScore = evaluateSchemaMarkup(params.schemaMarkup);
  factors.push(schemaScore.factor);
  if (schemaScore.suggestion) suggestions.push(schemaScore.suggestion);

  // 7. TL;DR Summary (max 10 points)
  const tldrScore = evaluateTLDR(params.tldr);
  factors.push(tldrScore.factor);
  if (tldrScore.suggestion) suggestions.push(tldrScore.suggestion);

  // 8. CTA Presence (max 5 points)
  const ctaScore = evaluateCTA(params.content.cta);
  factors.push(ctaScore.factor);
  if (ctaScore.suggestion) suggestions.push(ctaScore.suggestion);

  // Calculate total score
  const totalPoints = factors.reduce((sum, f) => sum + f.score, 0);
  const maxPoints = factors.reduce((sum, f) => sum + f.maxScore, 0);
  const totalScore = totalPoints / maxPoints;

  return {
    totalScore,
    factors,
    suggestions: suggestions.slice(0, 5), // Top 5 suggestions
  };
}

function getStatus(score: number, max: number): QualityFactor['status'] {
  const percentage = score / max;
  if (percentage >= 0.9) return 'excellent';
  if (percentage >= 0.7) return 'good';
  if (percentage >= 0.5) return 'warning';
  return 'poor';
}

function evaluateTitle(title: string): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 15;
  let score = 0;
  let suggestion: string | undefined;

  const length = title?.length || 0;

  if (length >= 30 && length <= 60) {
    score = 15; // Perfect length
  } else if (length >= 20 && length <= 70) {
    score = 12;
  } else if (length >= 10 && length <= 80) {
    score = 8;
    suggestion = 'Título deve ter entre 30-60 caracteres para melhor SEO';
  } else {
    score = 4;
    suggestion = 'Título muito curto ou longo - ideal: 30-60 caracteres';
  }

  return {
    factor: {
      name: 'Título',
      score,
      maxScore,
      description: `${length} caracteres (ideal: 30-60)`,
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

function evaluateMetaDescription(meta: string | null): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 15;
  let score = 0;
  let suggestion: string | undefined;

  const length = meta?.length || 0;

  if (!meta) {
    score = 0;
    suggestion = 'Adicione uma meta description para melhorar CTR nos resultados';
  } else if (length >= 120 && length <= 160) {
    score = 15;
  } else if (length >= 80 && length <= 180) {
    score = 12;
  } else if (length >= 50 && length <= 200) {
    score = 8;
    suggestion = 'Meta description deve ter 120-160 caracteres';
  } else {
    score = 4;
    suggestion = 'Meta description fora do tamanho ideal (120-160 caracteres)';
  }

  return {
    factor: {
      name: 'Meta Description',
      score,
      maxScore,
      description: meta ? `${length} caracteres (ideal: 120-160)` : 'Não definida',
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

function evaluateH1(h1: string | null, title: string): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 10;
  let score = 0;
  let suggestion: string | undefined;

  if (!h1) {
    score = 0;
    suggestion = 'Adicione um H1 único para a página';
  } else {
    score = 6;
    
    // Bonus for unique H1 different from title
    if (h1 !== title && h1.length >= 20) {
      score = 10;
    } else if (h1.length >= 15) {
      score = 8;
    }
  }

  return {
    factor: {
      name: 'Tag H1',
      score,
      maxScore,
      description: h1 ? `${h1.length} caracteres` : 'Não definido',
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

function evaluateContent(content: SEOContent): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 20;
  let score = 0;
  let suggestion: string | undefined;

  const sections = content.sections || [];
  const totalWords = sections.reduce((sum, section) => {
    const sectionWords = (section.content?.split(/\s+/).length || 0);
    const itemWords = section.items?.reduce((s, item) => s + item.split(/\s+/).length, 0) || 0;
    return sum + sectionWords + itemWords;
  }, 0);

  // Score based on word count
  if (totalWords >= 1500) {
    score = 12;
  } else if (totalWords >= 1000) {
    score = 10;
  } else if (totalWords >= 500) {
    score = 7;
  } else if (totalWords >= 200) {
    score = 4;
    suggestion = 'Conteúdo curto - adicione mais 500+ palavras para melhor ranking';
  } else {
    score = 2;
    suggestion = 'Conteúdo muito curto - artigos SEO devem ter 1000+ palavras';
  }

  // Bonus for section variety
  const sectionTypes = new Set(sections.map(s => s.type));
  if (sectionTypes.size >= 3) {
    score += 4;
  } else if (sectionTypes.size >= 2) {
    score += 2;
  }

  // Bonus for multiple sections (structure)
  if (sections.length >= 5) {
    score += 4;
  } else if (sections.length >= 3) {
    score += 2;
  } else if (sections.length < 2) {
    suggestion = suggestion || 'Adicione mais secções para melhor estrutura';
  }

  score = Math.min(score, maxScore);

  return {
    factor: {
      name: 'Conteúdo',
      score,
      maxScore,
      description: `${totalWords} palavras, ${sections.length} secções`,
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

function evaluateFAQs(faqs?: Array<{ question: string; answer: string }>): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 15;
  let score = 0;
  let suggestion: string | undefined;

  const count = faqs?.length || 0;

  if (count >= 5) {
    score = 15;
  } else if (count >= 3) {
    score = 12;
  } else if (count >= 2) {
    score = 8;
    suggestion = 'Adicione mais 3 FAQs para schema markup completo';
  } else if (count === 1) {
    score = 4;
    suggestion = 'Adicione mais FAQs (mínimo 3) para rich snippets';
  } else {
    score = 0;
    suggestion = 'Adicione FAQs para melhorar visibilidade nos resultados';
  }

  // Check FAQ quality (answer length)
  if (faqs && faqs.length > 0) {
    const avgAnswerLength = faqs.reduce((sum, faq) => sum + (faq.answer?.length || 0), 0) / faqs.length;
    if (avgAnswerLength < 50) {
      score = Math.max(score - 3, 0);
      suggestion = 'Respostas das FAQs muito curtas - expanda para 100+ caracteres';
    }
  }

  return {
    factor: {
      name: 'FAQs',
      score,
      maxScore,
      description: count > 0 ? `${count} perguntas` : 'Nenhuma FAQ',
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

function evaluateSchemaMarkup(schema: Record<string, unknown> | null): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 10;
  let score = 0;
  let suggestion: string | undefined;

  if (!schema || Object.keys(schema).length === 0) {
    score = 0;
    suggestion = 'Adicione Schema Markup (JSON-LD) para rich snippets';
  } else {
    const hasType = '@type' in schema;
    const hasContext = '@context' in schema;
    const propertyCount = Object.keys(schema).length;

    if (hasType && hasContext && propertyCount >= 5) {
      score = 10;
    } else if (hasType && hasContext) {
      score = 7;
    } else {
      score = 4;
      suggestion = 'Schema Markup incompleto - adicione mais propriedades';
    }
  }

  return {
    factor: {
      name: 'Schema Markup',
      score,
      maxScore,
      description: schema ? `${Object.keys(schema).length} propriedades` : 'Não definido',
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

function evaluateTLDR(tldr: string | null): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 10;
  let score = 0;
  let suggestion: string | undefined;

  const length = tldr?.length || 0;

  if (!tldr) {
    score = 0;
    suggestion = 'Adicione um resumo TL;DR para melhor engagement';
  } else if (length >= 100 && length <= 300) {
    score = 10;
  } else if (length >= 50 && length <= 400) {
    score = 7;
  } else {
    score = 4;
    suggestion = 'TL;DR deve ter 100-300 caracteres';
  }

  return {
    factor: {
      name: 'TL;DR',
      score,
      maxScore,
      description: tldr ? `${length} caracteres` : 'Não definido',
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

function evaluateCTA(cta?: { type: string; text: string; url: string }): { factor: QualityFactor; suggestion?: string } {
  const maxScore = 5;
  let score = 0;
  let suggestion: string | undefined;

  if (!cta || !cta.text || !cta.url) {
    score = 0;
    suggestion = 'Adicione um CTA para melhorar conversões';
  } else {
    score = 5;
  }

  return {
    factor: {
      name: 'Call-to-Action',
      score,
      maxScore,
      description: cta?.text ? 'Configurado' : 'Não definido',
      status: getStatus(score, maxScore),
    },
    suggestion,
  };
}

/**
 * Calculate score from an SEOEntity directly
 */
export function calculateEntityScore(entity: {
  title: string;
  meta_description: string | null;
  h1: string | null;
  tldr: string | null;
  content: SEOContent;
  schema_markup: Record<string, unknown> | null;
}): QualityScoreBreakdown {
  return calculateQualityScore({
    title: entity.title,
    metaDescription: entity.meta_description,
    h1: entity.h1,
    tldr: entity.tldr,
    content: entity.content,
    schemaMarkup: entity.schema_markup,
  });
}
