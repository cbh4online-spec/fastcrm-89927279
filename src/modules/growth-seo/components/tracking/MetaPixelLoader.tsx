import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useConsent } from '../../hooks/useConsent';
import { initializeMetaPixel } from './GTMProvider';

// Default Meta Pixel ID - can be overridden via settings
const DEFAULT_META_PIXEL_ID = '1751152942391229';
const META_PIXEL_SESSION_KEY = `__meta_pixel_loaded_${DEFAULT_META_PIXEL_ID}`;

/**
 * MetaPixelLoader - Loads Meta Pixel respecting GDPR consent
 *
 * 1. Só inicializa com consentimento de marketing
 * 2. Inicializa o pixel configurado (PageView inicial incluído)
 * 3. Envia PageView em cada mudança de rota (SPA)
 */
export function MetaPixelLoader() {
  const { consent, hasConsented } = useConsent();
  const location = useLocation();
  const pixelInitialized = useRef(false);
  const skipFirstPageView = useRef(true);

  useEffect(() => {
    if (!pixelInitialized.current && hasConsented && consent.marketing) {
      if (sessionStorage.getItem(META_PIXEL_SESSION_KEY) !== '1') {
        initializeMetaPixel(DEFAULT_META_PIXEL_ID, true);
        sessionStorage.setItem(META_PIXEL_SESSION_KEY, '1');
      }
      pixelInitialized.current = true;
    }
  }, [consent.marketing, hasConsented]);

  // Track page views on route changes (evita duplicar o PageView inicial)
  useEffect(() => {
    if (skipFirstPageView.current) {
      skipFirstPageView.current = false;
      return;
    }
    if (pixelInitialized.current && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [location.pathname]);

  return null;
}

/**
 * MetaPixelNoScript - Fallback for browsers without JavaScript
 * This should be added to index.html or rendered at the top of the body
 */
export function MetaPixelNoScript({ pixelId = DEFAULT_META_PIXEL_ID }: { pixelId?: string }) {
  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
