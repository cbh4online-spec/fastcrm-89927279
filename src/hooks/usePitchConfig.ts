import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_PRICING_PLANS, DEFAULT_TOKENS, PitchHistoryEntry, PitchTokens } from '@/lib/pitch/tokens';
import type { SlideContent } from '@/lib/pitch/slideContent';

const MAX_HISTORY = 10;

function configKey(userId: string | undefined) {
  return `pitch.config.${userId ?? 'anon'}`;
}

function historyKey(userId: string | undefined) {
  return `pitch.history.${userId ?? 'anon'}`;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function migrate(t: PitchTokens): PitchTokens {
  let out = t;
  if (!out.pricingPlans || !Array.isArray(out.pricingPlans) || out.pricingPlans.length === 0) {
    out = { ...out, pricingPlans: DEFAULT_PRICING_PLANS };
  }
  if (!out.slideOverrides || typeof out.slideOverrides !== 'object') {
    out = { ...out, slideOverrides: {} };
  }
  if (!out.currency) out = { ...out, currency: 'EUR' };
  if (!out.billingInterval) out = { ...out, billingInterval: 'monthly' };
  if (!out.tier) out = { ...out, tier: 'grow' };
  if (!Array.isArray(out.customCurrencies)) out = { ...out, customCurrencies: [] };
  return out;
}

export function usePitchConfig() {
  const { user } = useAuth();
  const userId = user?.id;
  const fullName = (user?.user_metadata as any)?.full_name || '';

  const [tokens, setTokens] = useState<PitchTokens>(() =>
    migrate(readJSON<PitchTokens>(configKey(userId), {
      ...DEFAULT_TOKENS,
      presenterName: fullName,
      presenterEmail: user?.email || '',
    }))
  );

  const [history, setHistory] = useState<PitchHistoryEntry[]>(() =>
    readJSON<PitchHistoryEntry[]>(historyKey(userId), [])
  );

  // Re-load when user changes
  useEffect(() => {
    setTokens(
      migrate(readJSON<PitchTokens>(configKey(userId), {
        ...DEFAULT_TOKENS,
        presenterName: fullName,
        presenterEmail: user?.email || '',
      }))
    );
    setHistory(readJSON<PitchHistoryEntry[]>(historyKey(userId), []));
  }, [userId, fullName, user?.email]);

  // Persist tokens
  useEffect(() => {
    try {
      localStorage.setItem(configKey(userId), JSON.stringify(tokens));
    } catch {
      /* quota — ignore */
    }
  }, [tokens, userId]);

  const updateToken = useCallback(<K extends keyof PitchTokens>(key: K, value: PitchTokens[K]) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetTokens = useCallback(() => {
    setTokens({
      ...DEFAULT_TOKENS,
      presenterName: fullName,
      presenterEmail: user?.email || '',
    });
  }, [fullName, user?.email]);

  const updateSlideContent = useCallback((slideId: string, patch: Partial<SlideContent>) => {
    setTokens((prev) => {
      const current = prev.slideOverrides?.[slideId] || {};
      return {
        ...prev,
        slideOverrides: { ...(prev.slideOverrides || {}), [slideId]: { ...current, ...patch } },
      };
    });
  }, []);

  const resetSlideContent = useCallback((slideId: string) => {
    setTokens((prev) => {
      const next = { ...(prev.slideOverrides || {}) };
      delete next[slideId];
      return { ...prev, slideOverrides: next };
    });
  }, []);

  const resetAllSlideContent = useCallback(() => {
    setTokens((prev) => ({ ...prev, slideOverrides: {} }));
  }, []);

  const saveToHistory = useCallback(() => {
    if (!tokens.companyName.trim() && !tokens.contactName.trim()) return;
    const entry: PitchHistoryEntry = {
      contactName: tokens.contactName,
      companyName: tokens.companyName,
      savedAt: new Date().toISOString(),
      tokens: { ...tokens },
    };
    setHistory((prev) => {
      const filtered = prev.filter(
        (h) =>
          !(h.companyName === entry.companyName && h.contactName === entry.contactName)
      );
      const next = [entry, ...filtered].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(historyKey(userId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [tokens, userId]);

  const loadFromHistory = useCallback((entry: PitchHistoryEntry) => {
    setTokens(migrate(entry.tokens));
  }, []);

  const removeFromHistory = useCallback(
    (savedAt: string) => {
      setHistory((prev) => {
        const next = prev.filter((h) => h.savedAt !== savedAt);
        try {
          localStorage.setItem(historyKey(userId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [userId]
  );

  return useMemo(
    () => ({
      tokens,
      setTokens,
      updateToken,
      resetTokens,
      updateSlideContent,
      resetSlideContent,
      resetAllSlideContent,
      history,
      saveToHistory,
      loadFromHistory,
      removeFromHistory,
    }),
    [tokens, updateToken, resetTokens, updateSlideContent, resetSlideContent, resetAllSlideContent, history, saveToHistory, loadFromHistory, removeFromHistory]
  );
}
