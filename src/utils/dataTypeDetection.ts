import { DetectedDataType, ConfidenceLevel, DataTransformation, ColumnDetection } from "@/types/import";

// Regular expressions for data type detection
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone_pt: /^(?:\+351\s?)?(?:9[1236]\d{7}|2\d{8})$/,
  phone_general: /^[\d\s+()-]{7,20}$/,
  nif_pt: /^\d{9}$/,
  postal_pt: /^\d{4}-?\d{3}$/,
  postal_general: /^\d{4,10}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i,
  currency_pt: /^€?\s*[\d.,]+\s*€?$/,
  currency_general: /^[$€£¥]?\s*[\d.,]+\s*[$€£¥]?$/,
  date_pt: /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
  date_iso: /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
  boolean: /^(sim|não|yes|no|true|false|1|0|s|n|y|v|f)$/i,
  number: /^-?[\d.,]+$/,
  tags: /^[\w\s]+[,;|][\w\s,;|]+$/,
};

// Common header patterns for field detection
const HEADER_PATTERNS: Record<string, { pattern: RegExp; field: string; type: DetectedDataType }[]> = {
  email: [
    { pattern: /^e-?mail$/i, field: 'email', type: 'email' },
    { pattern: /^correio\s*electr[oó]nico$/i, field: 'email', type: 'email' },
  ],
  phone: [
    { pattern: /^(tele)?fone$/i, field: 'phone', type: 'phone' },
    { pattern: /^contacto$/i, field: 'phone', type: 'phone' },
    { pattern: /^tel[e.]?m[oó]vel$/i, field: 'phone', type: 'phone' },
    { pattern: /^mobile$/i, field: 'phone', type: 'phone' },
    { pattern: /^whatsapp$/i, field: 'whatsapp_number', type: 'phone' },
  ],
  name: [
    { pattern: /^nome$/i, field: 'name', type: 'text' },
    { pattern: /^name$/i, field: 'name', type: 'text' },
    { pattern: /^designa[çc][aã]o$/i, field: 'name', type: 'text' },
    { pattern: /^raz[aã]o\s*social$/i, field: 'name', type: 'text' },
  ],
  nif: [
    { pattern: /^nif$/i, field: 'tax_id', type: 'nif' },
    { pattern: /^nipc$/i, field: 'tax_id', type: 'nif' },
    { pattern: /^contribuinte$/i, field: 'tax_id', type: 'nif' },
    { pattern: /^n[uú]mero\s*fiscal$/i, field: 'tax_id', type: 'nif' },
    { pattern: /^vat$/i, field: 'tax_id', type: 'nif' },
  ],
  address: [
    { pattern: /^morada$/i, field: 'address', type: 'text' },
    { pattern: /^endere[çc]o$/i, field: 'address', type: 'text' },
    { pattern: /^address$/i, field: 'address', type: 'text' },
    { pattern: /^rua$/i, field: 'address', type: 'text' },
  ],
  city: [
    { pattern: /^cidade$/i, field: 'city', type: 'text' },
    { pattern: /^city$/i, field: 'city', type: 'text' },
    { pattern: /^localidade$/i, field: 'city', type: 'text' },
  ],
  postal: [
    { pattern: /^c[oó]digo\s*postal$/i, field: 'postal_code', type: 'postal_code' },
    { pattern: /^cp$/i, field: 'postal_code', type: 'postal_code' },
    { pattern: /^postal$/i, field: 'postal_code', type: 'postal_code' },
    { pattern: /^zip$/i, field: 'postal_code', type: 'postal_code' },
  ],
  company: [
    { pattern: /^empresa$/i, field: 'company', type: 'text' },
    { pattern: /^company$/i, field: 'company', type: 'text' },
    { pattern: /^organiza[çc][aã]o$/i, field: 'company', type: 'text' },
  ],
  job: [
    { pattern: /^cargo$/i, field: 'job_title', type: 'text' },
    { pattern: /^fun[çc][aã]o$/i, field: 'job_title', type: 'text' },
    { pattern: /^job\s*title$/i, field: 'job_title', type: 'text' },
    { pattern: /^position$/i, field: 'job_title', type: 'text' },
  ],
  source: [
    { pattern: /^origem$/i, field: 'source', type: 'text' },
    { pattern: /^source$/i, field: 'source', type: 'text' },
    { pattern: /^canal$/i, field: 'source', type: 'text' },
  ],
  tags: [
    { pattern: /^tags$/i, field: 'tags', type: 'tags' },
    { pattern: /^etiquetas$/i, field: 'tags', type: 'tags' },
    { pattern: /^categorias$/i, field: 'tags', type: 'tags' },
  ],
  notes: [
    { pattern: /^notas$/i, field: 'notes', type: 'text' },
    { pattern: /^notes$/i, field: 'notes', type: 'text' },
    { pattern: /^observa[çc][oõ]es$/i, field: 'notes', type: 'text' },
  ],
  website: [
    { pattern: /^website$/i, field: 'website', type: 'url' },
    { pattern: /^site$/i, field: 'website', type: 'url' },
    { pattern: /^url$/i, field: 'website', type: 'url' },
  ],
  price: [
    { pattern: /^pre[çc]o$/i, field: 'price', type: 'currency' },
    { pattern: /^price$/i, field: 'price', type: 'currency' },
    { pattern: /^valor$/i, field: 'price', type: 'currency' },
  ],
  revenue: [
    { pattern: /^receita$/i, field: 'annual_revenue', type: 'currency' },
    { pattern: /^revenue$/i, field: 'annual_revenue', type: 'currency' },
    { pattern: /^fatura[çc][aã]o$/i, field: 'annual_revenue', type: 'currency' },
    { pattern: /^vendas$/i, field: 'total_revenue', type: 'currency' },
  ],
};

/**
 * Detect the data type of a value
 */
export function detectValueType(value: string): { type: DetectedDataType; confidence: ConfidenceLevel } {
  const trimmed = value.trim();
  
  if (!trimmed) {
    return { type: 'text', confidence: 'low' };
  }

  // Check email
  if (PATTERNS.email.test(trimmed)) {
    return { type: 'email', confidence: 'high' };
  }

  // Check NIF (Portuguese tax ID)
  if (PATTERNS.nif_pt.test(trimmed.replace(/\s/g, ''))) {
    return { type: 'nif', confidence: 'high' };
  }

  // Check Portuguese postal code
  if (PATTERNS.postal_pt.test(trimmed)) {
    return { type: 'postal_code', confidence: 'high' };
  }

  // Check URL
  if (PATTERNS.url.test(trimmed)) {
    return { type: 'url', confidence: 'high' };
  }

  // Check Portuguese phone
  const phoneClean = trimmed.replace(/[\s()-]/g, '');
  if (PATTERNS.phone_pt.test(phoneClean)) {
    return { type: 'phone', confidence: 'high' };
  }

  // Check general phone
  if (PATTERNS.phone_general.test(trimmed)) {
    return { type: 'phone', confidence: 'medium' };
  }

  // Check boolean
  if (PATTERNS.boolean.test(trimmed)) {
    return { type: 'boolean', confidence: 'high' };
  }

  // Check dates
  if (PATTERNS.date_iso.test(trimmed)) {
    return { type: 'date', confidence: 'high' };
  }
  if (PATTERNS.date_pt.test(trimmed)) {
    return { type: 'date', confidence: 'high' };
  }

  // Check currency (with € symbol)
  if (PATTERNS.currency_pt.test(trimmed)) {
    return { type: 'currency', confidence: 'high' };
  }

  // Check currency (general with symbols)
  if (PATTERNS.currency_general.test(trimmed) && !PATTERNS.number.test(trimmed)) {
    return { type: 'currency', confidence: 'medium' };
  }

  // Check tags (comma/semicolon separated values)
  if (PATTERNS.tags.test(trimmed)) {
    return { type: 'tags', confidence: 'medium' };
  }

  // Check number
  if (PATTERNS.number.test(trimmed)) {
    return { type: 'number', confidence: 'medium' };
  }

  return { type: 'text', confidence: 'low' };
}

/**
 * Detect the data type for a column based on sample values
 */
export function detectColumnType(sampleValues: string[]): { type: DetectedDataType; confidence: ConfidenceLevel } {
  const typeScores: Record<DetectedDataType, { high: number; medium: number; low: number }> = {
    text: { high: 0, medium: 0, low: 0 },
    email: { high: 0, medium: 0, low: 0 },
    phone: { high: 0, medium: 0, low: 0 },
    currency: { high: 0, medium: 0, low: 0 },
    date: { high: 0, medium: 0, low: 0 },
    nif: { high: 0, medium: 0, low: 0 },
    postal_code: { high: 0, medium: 0, low: 0 },
    url: { high: 0, medium: 0, low: 0 },
    boolean: { high: 0, medium: 0, low: 0 },
    number: { high: 0, medium: 0, low: 0 },
    tags: { high: 0, medium: 0, low: 0 },
  };

  const validValues = sampleValues.filter(v => v && v.trim());
  
  for (const value of validValues) {
    const { type, confidence } = detectValueType(value);
    typeScores[type][confidence]++;
  }

  // Calculate weighted scores
  let bestType: DetectedDataType = 'text';
  let bestScore = 0;
  let overallConfidence: ConfidenceLevel = 'low';

  for (const [type, scores] of Object.entries(typeScores)) {
    const weightedScore = scores.high * 3 + scores.medium * 2 + scores.low * 1;
    if (weightedScore > bestScore) {
      bestScore = weightedScore;
      bestType = type as DetectedDataType;
      
      const total = scores.high + scores.medium + scores.low;
      if (total > 0) {
        const highRatio = scores.high / total;
        const mediumRatio = scores.medium / total;
        
        if (highRatio >= 0.7) {
          overallConfidence = 'high';
        } else if (highRatio + mediumRatio >= 0.6) {
          overallConfidence = 'medium';
        } else {
          overallConfidence = 'low';
        }
      }
    }
  }

  return { type: bestType, confidence: overallConfidence };
}

/**
 * Suggest field mapping based on header name
 */
export function suggestFieldFromHeader(header: string): { field: string; type: DetectedDataType } | null {
  const normalizedHeader = header.toLowerCase().trim();

  for (const patterns of Object.values(HEADER_PATTERNS)) {
    for (const { pattern, field, type } of patterns) {
      if (pattern.test(normalizedHeader)) {
        return { field, type };
      }
    }
  }

  return null;
}

/**
 * Generate suggested transformations for a data type
 */
export function getSuggestedTransformations(type: DetectedDataType, sampleValues: string[]): DataTransformation[] {
  const transformations: DataTransformation[] = [];

  switch (type) {
    case 'phone':
      // Check if phone numbers need normalization
      const hasUnnormalizedPhone = sampleValues.some(v => 
        v && !v.startsWith('+351') && PATTERNS.phone_general.test(v)
      );
      if (hasUnnormalizedPhone) {
        const sample = sampleValues.find(v => v && !v.startsWith('+351'));
        transformations.push({
          type: 'normalize_phone',
          description: 'Adicionar código +351 e formatar',
          example: sample ? {
            before: sample,
            after: formatPhone(sample),
          } : undefined,
          enabled: true,
        });
      }
      break;

    case 'postal_code':
      // Check if postal codes need formatting
      const hasUnformattedPostal = sampleValues.some(v => 
        v && v.match(/^\d{7}$/)
      );
      if (hasUnformattedPostal) {
        const sample = sampleValues.find(v => v && v.match(/^\d{7}$/));
        transformations.push({
          type: 'normalize_postal',
          description: 'Formatar código postal (XXXX-XXX)',
          example: sample ? {
            before: sample,
            after: formatPostalCode(sample),
          } : undefined,
          enabled: true,
        });
      }
      break;

    case 'currency':
      // Check if currency needs normalization
      const hasVariedCurrency = sampleValues.some(v => 
        v && (v.includes('€') || v.includes(','))
      );
      if (hasVariedCurrency) {
        const sample = sampleValues.find(v => v && (v.includes('€') || v.includes(',')));
        transformations.push({
          type: 'normalize_currency',
          description: 'Converter para número decimal',
          example: sample ? {
            before: sample,
            after: String(parseCurrency(sample)),
          } : undefined,
          enabled: true,
        });
      }
      break;

    case 'date':
      // Check if dates need normalization
      const hasPTDate = sampleValues.some(v => 
        v && PATTERNS.date_pt.test(v) && !PATTERNS.date_iso.test(v)
      );
      if (hasPTDate) {
        const sample = sampleValues.find(v => v && PATTERNS.date_pt.test(v));
        transformations.push({
          type: 'normalize_date',
          description: 'Converter para formato ISO (YYYY-MM-DD)',
          example: sample ? {
            before: sample,
            after: formatDateToISO(sample),
          } : undefined,
          enabled: true,
        });
      }
      break;

    case 'tags':
      // Check separator type
      const hasMixedSeparators = sampleValues.some(v => 
        v && (v.includes(';') || v.includes('|'))
      );
      if (hasMixedSeparators) {
        const sample = sampleValues.find(v => v && (v.includes(';') || v.includes('|')));
        transformations.push({
          type: 'normalize_tags',
          description: 'Normalizar separadores de tags',
          example: sample ? {
            before: sample,
            after: normalizeTags(sample).join(', '),
          } : undefined,
          enabled: true,
        });
      }
      break;

    case 'nif':
      // Check if NIF needs formatting
      const hasSpacedNIF = sampleValues.some(v => 
        v && v.includes(' ') && v.replace(/\s/g, '').match(/^\d{9}$/)
      );
      if (hasSpacedNIF) {
        const sample = sampleValues.find(v => v && v.includes(' '));
        transformations.push({
          type: 'normalize_nif',
          description: 'Remover espaços do NIF',
          example: sample ? {
            before: sample,
            after: sample.replace(/\s/g, ''),
          } : undefined,
          enabled: true,
        });
      }
      break;
  }

  return transformations;
}

/**
 * Analyze a column and return full detection info
 */
export function analyzeColumn(header: string, values: string[]): ColumnDetection {
  const sampleValues = values.slice(0, 50).filter(v => v && v.trim());
  
  // First try to detect from header
  const headerSuggestion = suggestFieldFromHeader(header);
  
  // Then detect from values
  const { type: detectedType, confidence } = detectColumnType(sampleValues);
  
  // Use header suggestion type if available and matches value detection
  const finalType = headerSuggestion?.type || detectedType;
  
  // Get transformations
  const suggestedTransformations = getSuggestedTransformations(finalType, sampleValues);

  return {
    header,
    sampleValues: sampleValues.slice(0, 5),
    detectedType: finalType,
    confidence: headerSuggestion ? 'high' : confidence,
    suggestedField: headerSuggestion?.field,
    suggestedTransformations,
  };
}

// Transformation functions
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, '');
  
  // If already has country code
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  }
  
  // Add Portuguese code
  if (cleaned.match(/^9\d{8}$/)) {
    return `+351 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // Format 2XX numbers (landlines)
  if (cleaned.match(/^2\d{8}$/)) {
    return `+351 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone;
}

export function formatPostalCode(postal: string): string {
  const cleaned = postal.replace(/[\s-]/g, '');
  if (cleaned.match(/^\d{7}$/)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return postal;
}

export function parseCurrency(value: string): number {
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[€$£¥\s]/g, '');
  
  // Handle Portuguese format (1.234,56)
  if (cleaned.match(/\d+\.\d{3},\d{2}$/)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Handle simple comma as decimal (1234,56)
  else if (cleaned.match(/,\d{1,2}$/)) {
    cleaned = cleaned.replace(',', '.');
  }
  
  return parseFloat(cleaned) || 0;
}

export function formatDateToISO(date: string): string {
  // Handle dd-mm-yyyy or dd/mm/yyyy
  const match = date.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return date;
}

export function normalizeTags(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

export function applyTransformation(value: string, type: DataTransformation['type']): string {
  switch (type) {
    case 'normalize_phone':
      return formatPhone(value);
    case 'normalize_postal':
      return formatPostalCode(value);
    case 'normalize_currency':
      return String(parseCurrency(value));
    case 'normalize_date':
      return formatDateToISO(value);
    case 'normalize_nif':
      return value.replace(/\s/g, '');
    case 'normalize_tags':
      return normalizeTags(value).join(',');
    default:
      return value;
  }
}
