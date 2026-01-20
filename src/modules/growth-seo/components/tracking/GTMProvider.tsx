import { useEffect, ReactNode } from 'react';
import { useConsent } from '../../hooks/useConsent';

interface GTMProviderProps {
  children: ReactNode;
  containerId?: string;
}

// Extend Window interface for tracking scripts
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

export function GTMProvider({ children, containerId }: GTMProviderProps) {
  const { consent, hasConsented } = useConsent();

  useEffect(() => {
    if (!containerId) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];

    // Set initial consent state (consent mode v2)
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    // Push default consent state
    window.dataLayer.push({
      event: 'consent_default',
      analytics_storage: 'denied',
      ad_storage: 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'denied',
      security_storage: 'granted',
    });

    // Load GTM script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    document.head.appendChild(script);

    // Add noscript fallback to body
    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);

    return () => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
      if (noscript.parentNode) {
        document.body.removeChild(noscript);
      }
    };
  }, [containerId]);

  // Update consent when it changes
  useEffect(() => {
    if (!hasConsented) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consent_update',
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      personalization_storage: consent.marketing ? 'granted' : 'denied',
    });
  }, [consent, hasConsented]);

  return <>{children}</>;
}

// Standalone scripts for when GTM is not used
export function initializeGA4(measurementId: string, hasConsent: boolean) {
  if (!measurementId || !hasConsent) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ js: new Date() });
  window.dataLayer.push({ config: measurementId, send_page_view: false });
}

export function initializeMetaPixel(pixelId: string, hasConsent: boolean) {
  if (!pixelId || !hasConsent) return;
  
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  
  script.onload = () => {
    if (window.fbq) {
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
    }
  };
}

export function initializeClarity(projectId: string, hasConsent: boolean) {
  if (!projectId || !hasConsent) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
}
