import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ConsentState } from '../types';

const CONSENT_STORAGE_KEY = 'gdpr_consent';
const VISITOR_ID_KEY = 'gdpr_visitor_id';

function generateVisitorId(): string {
  return 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    hasConsented: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load consent from localStorage and sync with DB
  useEffect(() => {
    const loadConsent = async () => {
      try {
        const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ConsentState;
          setConsent(parsed);
        }

        const visitorId = getVisitorId();
        const { data, error } = await supabase
          .from('gdpr_consents')
          .select('*')
          .eq('visitor_id', visitorId)
          .maybeSingle();

        if (error) {
          console.warn('GDPR consent lookup failed:', error.message);
        } else if (data) {
          const dbConsent: ConsentState = {
            necessary: data.consent_necessary,
            analytics: data.consent_analytics,
            marketing: data.consent_marketing,
            hasConsented: true,
          };
          setConsent(dbConsent);
          localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(dbConsent));
        }
      } catch (error) {
        console.error('Error loading consent:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConsent();
  }, []);

  const updateConsent = useCallback(async (newConsent: Partial<Omit<ConsentState, 'hasConsented'>>) => {
    const visitorId = getVisitorId();

    const updatedConsent: ConsentState = {
      necessary: newConsent.necessary ?? consent.necessary,
      analytics: newConsent.analytics ?? consent.analytics,
      marketing: newConsent.marketing ?? consent.marketing,
      hasConsented: true,
    };

    setConsent(updatedConsent);
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updatedConsent));

    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'consent_update',
        analytics_storage: updatedConsent.analytics ? 'granted' : 'denied',
        ad_storage: updatedConsent.marketing ? 'granted' : 'denied',
      });
    }

    try {
      const { data: existing, error: existingError } = await supabase
        .from('gdpr_consents')
        .select('id')
        .eq('visitor_id', visitorId)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('gdpr_consents')
          .update({
            consent_necessary: updatedConsent.necessary,
            consent_analytics: updatedConsent.analytics,
            consent_marketing: updatedConsent.marketing,
            consent_updated_at: new Date().toISOString(),
          })
          .eq('visitor_id', visitorId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('gdpr_consents')
          .insert({
            visitor_id: visitorId,
            consent_necessary: updatedConsent.necessary,
            consent_analytics: updatedConsent.analytics,
            consent_marketing: updatedConsent.marketing,
            user_agent: navigator.userAgent,
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  }, [consent]);

  const acceptAll = useCallback(() => {
    updateConsent({ necessary: true, analytics: true, marketing: true });
  }, [updateConsent]);

  const rejectOptional = useCallback(() => {
    updateConsent({ necessary: true, analytics: false, marketing: false });
  }, [updateConsent]);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      hasConsented: false,
    });
  }, []);

  return {
    consent,
    isLoading,
    updateConsent,
    acceptAll,
    rejectOptional,
    resetConsent,
    hasConsented: consent.hasConsented,
  };
}

// Type augmentation for window.dataLayer
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}
