const PRODUCTION_HOST = 'https://fastcrm.lovable.app';

function isPreviewHost(host: string): boolean {
  return (
    host.endsWith('.lovableproject.com') ||
    host.endsWith('.lovable.app') ||
    host.endsWith('.lovable.dev') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
}

export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return PRODUCTION_HOST;
  // For previews, use the current origin so the link works in the same env
  if (isPreviewHost(window.location.hostname)) return window.location.origin;
  return window.location.origin;
}

export function getPitchPublicUrl(token: string): string {
  return `${getPublicBaseUrl()}/p/${token}`;
}
