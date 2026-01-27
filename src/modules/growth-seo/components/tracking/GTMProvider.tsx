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
    fbq: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue: unknown[];
      push: (...args: unknown[]) => void;
      loaded: boolean;
      version: string;
    };
    _fbq?: typeof window.fbq;
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
  
  // Check if already initialized
  if (window.fbq) return;
  
  // Initialize fbq BEFORE script loads (official Meta Pixel implementation)
  const n = function(...args: unknown[]) {
    if (n.callMethod) {
      n.callMethod.apply(n, args);
    } else {
      n.queue.push(args);
    }
  } as typeof window.fbq;
  
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  
  // Load the Facebook SDK script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode?.insertBefore(script, firstScript);
  
  // Initialize pixel and track PageView
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

export function initializeClarity(projectId: string, hasConsent: boolean) {
  if (!projectId || !hasConsent) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
}
