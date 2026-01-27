import { useEffect, useRef } from 'react';
import { useConsent } from '../../hooks/useConsent';
import { initializeMetaPixel
 } from './GTMProvider';

// Default Meta Pixel ID - can be overridden via settings
const DEFAULT_META_PIXEL_ID = '909068581793930';

/**
 * MetaPixelLoader - Loads Meta Pixel respecting GDPR consent
 * 
 * This component:
 * 1. Checks for marketing consent
 * 2. Initializes the Meta Pixel with the configured ID
 * 3. Tracks PageView events on navigation
 */
export function MetaPixelLoader() {
  const { consent, hasConsented } = useConsent();
  const pixelInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once when we have marketing consent
    if (!pixelInitialized.current && hasConsented && consent.marketing) {
      initializeMetaPixel(DEFAULT_META_PIXEL_ID, true);
      pixelInitialized.current = true;
      console.log('[MetaPixel] Initialized with ID:', DEFAULT_META_PIXEL_ID);
    }
  }, [consent.marketing, hasConsented]);

  // Track page views on route changes
  useEffect(() => {
    if (pixelInitialized.current && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [typeof window !== 'undefined' ? window.location.pathname : '']);

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
