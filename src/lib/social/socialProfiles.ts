/**
 * Normalização de perfis de redes sociais.
 *
 * Permite que o utilizador escreva apenas o handle (`@diogotricologia`),
 * o handle sem `@`, ou o endereço completo. Guardamos sempre o endereço
 * canónico do perfil, e sabemos derivar o link de mensagens quando a
 * plataforma o suporta.
 */

export type SocialNetwork =
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'youtube'
  | 'tiktok'
  | 'pinterest'
  | 'whatsapp';

interface NetworkDefinition {
  label: string;
  /** Domínios aceites (sem www). */
  domains: string[];
  /** Prefixo para construir o endereço do perfil. */
  profilePrefix: string;
  /** Prefixo para abrir a conversa; ausente = plataforma sem link de mensagens. */
  messagePrefix?: string;
  /** Prefixo a manter no handle apresentado (ex.: YouTube usa `@`). */
  handlePrefix?: string;
  /** Segmentos de caminho a ignorar ao extrair o handle (ex.: linkedin `in`). */
  ignoredSegments?: string[];
  /** Handle é um número de telefone (WhatsApp). */
  isPhone?: boolean;
}

export const SOCIAL_NETWORKS: Record<SocialNetwork, NetworkDefinition> = {
  linkedin: {
    label: 'LinkedIn',
    domains: ['linkedin.com', 'pt.linkedin.com'],
    profilePrefix: 'https://www.linkedin.com/in/',
    ignoredSegments: ['in', 'company', 'pub'],
  },
  instagram: {
    label: 'Instagram',
    domains: ['instagram.com', 'instagr.am', 'ig.me'],
    profilePrefix: 'https://www.instagram.com/',
    messagePrefix: 'https://ig.me/m/',
    ignoredSegments: ['m'],
  },
  facebook: {
    label: 'Facebook',
    domains: ['facebook.com', 'fb.com', 'm.me'],
    profilePrefix: 'https://www.facebook.com/',
    messagePrefix: 'https://m.me/',
  },
  twitter: {
    label: 'Twitter/X',
    domains: ['x.com', 'twitter.com'],
    profilePrefix: 'https://x.com/',
  },
  youtube: {
    label: 'YouTube',
    domains: ['youtube.com', 'youtu.be'],
    profilePrefix: 'https://www.youtube.com/@',
    handlePrefix: '@',
    ignoredSegments: ['c', 'channel', 'user'],
  },
  tiktok: {
    label: 'TikTok',
    domains: ['tiktok.com'],
    profilePrefix: 'https://www.tiktok.com/@',
    handlePrefix: '@',
  },
  pinterest: {
    label: 'Pinterest',
    domains: ['pinterest.com', 'pinterest.pt', 'pin.it'],
    profilePrefix: 'https://www.pinterest.com/',
  },
  whatsapp: {
    label: 'WhatsApp',
    domains: ['wa.me', 'api.whatsapp.com', 'whatsapp.com'],
    profilePrefix: 'https://wa.me/',
    messagePrefix: 'https://wa.me/',
    isPhone: true,
  },
};

export interface ParsedSocialProfile {
  network: SocialNetwork;
  /** Handle limpo, sem `@` nem domínio. */
  handle: string;
  /** Handle formatado para apresentação (ex.: `@diogotricologia`). */
  displayHandle: string;
  profileUrl: string;
  /** Link de conversa quando a plataforma suporta; senão o perfil. */
  messageUrl: string;
  supportsMessaging: boolean;
}

const HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;

function stripUrlNoise(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[?#]/)[0]
    .replace(/\/+$/, '');
}

function extractHandle(def: NetworkDefinition, value: string): string | null {
  const cleaned = stripUrlNoise(value);
  if (!cleaned) return null;

  const looksLikeUrl = cleaned.includes('/') || cleaned.includes('.');

  if (looksLikeUrl) {
    const [host, ...segments] = cleaned.split('/');
    const hostLower = host.toLowerCase();
    const matchesDomain = def.domains.some(
      (d) => hostLower === d || hostLower.endsWith(`.${d}`),
    );
    if (!matchesDomain) return null;

    const parts = segments
      .map((s) => s.replace(/^@/, ''))
      .filter((s) => s.length > 0 && !(def.ignoredSegments ?? []).includes(s.toLowerCase()));

    const candidate = parts[0];
    if (!candidate) return null;
    return sanitizeHandle(def, candidate);
  }

  return sanitizeHandle(def, cleaned.replace(/^@/, ''));
}

function sanitizeHandle(def: NetworkDefinition, raw: string): string | null {
  if (def.isPhone) {
    const digits = raw.replace(/[^\d]/g, '');
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }
  const handle = raw.replace(/^@/, '');
  return HANDLE_PATTERN.test(handle) ? handle : null;
}

/**
 * Interpreta o valor introduzido (handle ou endereço) para uma rede.
 * Devolve `null` se o valor não for reconhecível.
 */
export function parseSocialProfile(
  network: SocialNetwork,
  value: string | null | undefined,
): ParsedSocialProfile | null {
  if (!value || typeof value !== 'string' || !value.trim()) return null;
  const def = SOCIAL_NETWORKS[network];
  const handle = extractHandle(def, value);
  if (!handle) return null;

  const profileUrl = `${def.profilePrefix}${handle}`;
  return {
    network,
    handle,
    displayHandle: def.isPhone ? `+${handle}` : `${def.handlePrefix ?? '@'}${handle}`,
    profileUrl,
    messageUrl: def.messagePrefix ? `${def.messagePrefix}${handle}` : profileUrl,
    supportsMessaging: !!def.messagePrefix,
  };
}

/**
 * Valor canónico a gravar. Se não for reconhecível, devolve o valor original
 * (aparado) — nunca destruímos o que o utilizador escreveu.
 */
export function normalizeSocialValue(
  network: SocialNetwork,
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return parseSocialProfile(network, trimmed)?.profileUrl ?? trimmed;
}

/** Link para abrir mensagens (ou perfil, quando não há mensagens). */
export function socialMessageUrl(
  network: SocialNetwork,
  value: string | null | undefined,
): string | null {
  return parseSocialProfile(network, value)?.messageUrl ?? null;
}

/** Link para abrir o perfil público. */
export function socialProfileUrl(
  network: SocialNetwork,
  value: string | null | undefined,
): string | null {
  return parseSocialProfile(network, value)?.profileUrl ?? null;
}

/** Texto a apresentar (handle quando reconhecido, senão o valor original). */
export function socialDisplayValue(
  network: SocialNetwork,
  value: string | null | undefined,
): string {
  if (!value) return '';
  return parseSocialProfile(network, value)?.displayHandle ?? String(value);
}

/** Placeholder sugerido para o campo de input. */
export function socialPlaceholder(network: SocialNetwork): string {
  return SOCIAL_NETWORKS[network].isPhone ? '+351912345678' : '@utilizador';
}

/** Mapa campo -> rede, para os campos `*_url` das entidades. */
export const SOCIAL_FIELD_NETWORKS: Record<string, SocialNetwork> = {
  linkedin_url: 'linkedin',
  instagram_url: 'instagram',
  facebook_url: 'facebook',
  twitter_url: 'twitter',
  youtube_url: 'youtube',
  tiktok_url: 'tiktok',
  pinterest_url: 'pinterest',
  whatsapp_url: 'whatsapp',
};

export function socialNetworkForField(field: string): SocialNetwork | undefined {
  return SOCIAL_FIELD_NETWORKS[field];
}
