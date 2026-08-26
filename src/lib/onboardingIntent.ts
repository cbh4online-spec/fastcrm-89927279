const KEY = "onboardingIntent";

export interface OnboardingIntent {
  /** Nome indicado no registo (usado como nome da organização por defeito) */
  name?: string;
  email?: string;
  savedAt: string;
}

export function saveOnboardingIntent(intent: Omit<OnboardingIntent, "savedAt">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, savedAt: new Date().toISOString() }));
  } catch {
    /* localStorage indisponível — ignorar */
  }
}

export function readOnboardingIntent(): OnboardingIntent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingIntent;
    // Intenções com mais de 30 dias deixam de ser relevantes
    if (parsed.savedAt && Date.now() - new Date(parsed.savedAt).getTime() > 30 * 24 * 3600 * 1000) {
      clearOnboardingIntent();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearOnboardingIntent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}
