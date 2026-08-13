/**
 * Smart Offer Page — configuration types & defaults.
 * Persisted at products.metadata.offer_page (jsonb).
 */

export type OfferPreset =
  | "cosmetics"
  | "training"
  | "security"
  | "dropshipping"
  | "generic";

export type ConversionGoal =
  | "add_to_cart"
  | "buy_now"
  | "request_quote"
  | "request_contact"
  | "enroll"
  | "book_assessment"
  | "book_demo";

export interface TrustBadge {
  icon: string; // Lucide icon name
  title: string;
  description?: string;
}

export interface OfferFaqItem {
  id: string;
  question: string;
  answer: string;
  active: boolean;
}

export type OfferSectionKey =
  | "description"
  | "benefits"
  | "specifications"
  | "reviews"
  | "faq"
  | "relatedProducts"
  | "ingredients"
  | "howToUse"
  | "program"
  | "instructor"
  | "sessions"
  | "equipment"
  | "installation"
  | "delivery"
  | "warranty"
  | "documents"
  | "video";

/* ───────── Sector content (metadata.offer_page.sectorConfig) ───────── */

export interface OfferIngredient {
  name: string;
  role?: string;
}

export interface OfferStepItem {
  title: string;
  description?: string;
}

export interface OfferInstructor {
  name?: string;
  bio?: string;
  photoUrl?: string;
}

export interface OfferSession {
  date?: string;
  time?: string;
  location?: string;
  seats?: string;
}

export interface OfferSectorConfig {
  ingredients?: OfferIngredient[];
  howToUse?: OfferStepItem[];
  program?: OfferStepItem[];
  instructor?: OfferInstructor;
  sessions?: OfferSession[];
  equipment?: OfferStepItem[];
  installation?: OfferStepItem[];
  installationNote?: string;
  /** Free-form choice lists consumed by the decision panel. */
  modalities?: string[];
  spaces?: string[];
  needs?: string[];
  [key: string]: unknown;
}

export interface OfferPageConfig {
  version: 1;
  enabled: boolean;
  preset: OfferPreset;
  conversionGoal: ConversionGoal;
  headline?: string;
  subheadline?: string;
  shortDescription?: string;
  ctaLabel?: string;
  secondaryCtaLabel?: string;
  promoLabel?: string;
  savingsText?: string;
  deliveryText?: string;
  trustBadges: TrustBadge[];
  sections: Partial<Record<OfferSectionKey, boolean>>;
  /** Render order of the content sections; missing keys fall back to the default order. */
  sectionOrder?: OfferSectionKey[];
  sectorConfig?: OfferSectorConfig;
  faqItems: OfferFaqItem[];
}


export const DEFAULT_SECTIONS_BY_PRESET: Record<OfferPreset, Partial<Record<OfferSectionKey, boolean>>> = {
  cosmetics: {
    description: true,
    benefits: true,
    ingredients: true,
    howToUse: true,
    reviews: true,
    faq: true,
    relatedProducts: true,
  },
  training: {
    description: true,
    program: true,
    instructor: true,
    sessions: true,
    reviews: true,
    faq: true,
  },
  security: {
    description: true,
    equipment: true,
    installation: true,
    specifications: true,
    warranty: true,
    documents: true,
    faq: true,
  },
  dropshipping: {
    description: true,
    video: true,
    specifications: true,
    delivery: true,
    warranty: true,
    reviews: true,
    faq: true,
    relatedProducts: true,
  },
  generic: {
    description: true,
    benefits: true,
    specifications: true,
    reviews: true,
    faq: true,
    relatedProducts: true,
  },
};

export const PRESET_LABELS: Record<OfferPreset, string> = {
  cosmetics: "Cosmética e beleza",
  training: "Formação e cursos",
  security: "Segurança e instalações",
  dropshipping: "Dropshipping",
  generic: "Genérico",
};

export const CONVERSION_GOAL_LABELS: Record<ConversionGoal, string> = {
  add_to_cart: "Adicionar ao carrinho",
  buy_now: "Comprar agora",
  request_quote: "Pedir orçamento",
  request_contact: "Pedir contacto",
  enroll: "Inscrever-me",
  book_assessment: "Agendar avaliação",
  book_demo: "Marcar demonstração",
};

export const SECTION_LABELS: Record<OfferSectionKey, string> = {
  description: "Descrição",
  benefits: "Benefícios",
  specifications: "Especificações",
  reviews: "Avaliações",
  faq: "Perguntas frequentes",
  relatedProducts: "Produtos relacionados",
  ingredients: "Ingredientes",
  howToUse: "Modo de utilização",
  program: "Programa",
  instructor: "Formador",
  sessions: "Datas e sessões",
  equipment: "Equipamentos incluídos",
  installation: "Instalação",
  delivery: "Logística e entrega",
  warranty: "Garantia",
  documents: "Documentos",
  video: "Vídeo",
};

/** Objetivos suportados por implementação real neste MVP. */
export const AVAILABLE_CONVERSION_GOALS: ConversionGoal[] = [
  "add_to_cart",
  "buy_now",
  "request_quote",
  "request_contact",
  "enroll",
  "book_assessment",
  "book_demo",
];

export const DEFAULT_CONVERSION_BY_PRESET: Record<OfferPreset, ConversionGoal> = {
  cosmetics: "add_to_cart",
  training: "enroll",
  security: "request_quote",
  dropshipping: "buy_now",
  generic: "add_to_cart",
};

export function makeDefaultOfferPageConfig(preset: OfferPreset = "generic"): OfferPageConfig {
  return {
    version: 1,
    enabled: false,
    preset,
    conversionGoal: DEFAULT_CONVERSION_BY_PRESET[preset],
    trustBadges: [],
    sections: { ...DEFAULT_SECTIONS_BY_PRESET[preset] },
    faqItems: [],
  };
}

/**
 * Safely parse offer page config from a metadata blob.
 * Returns null when disabled or invalid — caller should fallback to legacy view.
 */
export function parseOfferPageConfig(metadata: unknown): OfferPageConfig | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as any).offer_page;
  if (!raw || typeof raw !== "object") return null;
  if (raw.enabled !== true) return null;

  const preset: OfferPreset = ["cosmetics", "training", "security", "dropshipping", "generic"].includes(raw.preset)
    ? raw.preset
    : "generic";

  const conversionGoal: ConversionGoal = AVAILABLE_CONVERSION_GOALS.includes(raw.conversionGoal)
    ? raw.conversionGoal
    : DEFAULT_CONVERSION_BY_PRESET[preset];

  return {
    version: 1,
    enabled: true,
    preset,
    conversionGoal,
    headline: typeof raw.headline === "string" ? raw.headline : undefined,
    subheadline: typeof raw.subheadline === "string" ? raw.subheadline : undefined,
    shortDescription: typeof raw.shortDescription === "string" ? raw.shortDescription : undefined,
    ctaLabel: typeof raw.ctaLabel === "string" ? raw.ctaLabel : undefined,
    secondaryCtaLabel: typeof raw.secondaryCtaLabel === "string" ? raw.secondaryCtaLabel : undefined,
    promoLabel: typeof raw.promoLabel === "string" ? raw.promoLabel : undefined,
    savingsText: typeof raw.savingsText === "string" ? raw.savingsText : undefined,
    deliveryText: typeof raw.deliveryText === "string" ? raw.deliveryText : undefined,
    trustBadges: Array.isArray(raw.trustBadges)
      ? raw.trustBadges.slice(0, 4).filter((b: any) => b && typeof b.title === "string")
      : [],
    sections: (raw.sections && typeof raw.sections === "object")
      ? raw.sections
      : { ...DEFAULT_SECTIONS_BY_PRESET[preset] },
    sectionOrder: Array.isArray(raw.sectionOrder)
      ? (raw.sectionOrder.filter((k: any) => DEFAULT_SECTION_ORDER.includes(k)) as OfferSectionKey[])
      : undefined,
    sectorConfig: (raw.sectorConfig && typeof raw.sectorConfig === "object") ? raw.sectorConfig : {},

    faqItems: Array.isArray(raw.faqItems)
      ? raw.faqItems.filter((f: any) => f && typeof f.question === "string" && typeof f.answer === "string")
      : [],
  };
}
