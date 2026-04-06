import { useEffect, useRef, useState, useCallback } from "react";

export interface ProactiveRule {
  trigger_type: "score_gte" | "time_on_page" | "scroll_pct" | "exit_intent" | "inactivity";
  value: number;
  message: string;
  enabled?: boolean;
}

interface UseProactiveChatTriggersOptions {
  rules: ProactiveRule[];
  getVisitorScore?: () => number;
  enabled?: boolean;
}

export function useProactiveChatTriggers({ rules, getVisitorScore, enabled = true }: UseProactiveChatTriggersOptions) {
  const [triggered, setTriggered] = useState<{ rule: ProactiveRule } | null>(null);
  const firedRef = useRef(new Set<string>());
  const startTimeRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());

  const getRuleKey = (r: ProactiveRule) => `${r.trigger_type}_${r.value}`;

  const fireRule = useCallback((rule: ProactiveRule) => {
    const key = getRuleKey(rule);
    if (firedRef.current.has(key)) return;
    // Check session cooldown (1 per session per rule type)
    const sessionKey = `proactive_chat_${key}`;
    if (sessionStorage.getItem(sessionKey)) return;
    
    firedRef.current.add(key);
    sessionStorage.setItem(sessionKey, String(Date.now()));
    setTriggered({ rule });
  }, []);

  const dismiss = useCallback(() => setTriggered(null), []);

  useEffect(() => {
    if (!enabled || rules.length === 0) return;

    const activeRules = rules.filter(r => r.enabled !== false);
    if (activeRules.length === 0) return;

    // Check score and time-based triggers periodically
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const inactivity = Math.floor((Date.now() - lastActivityRef.current) / 1000);

      for (const rule of activeRules) {
        if (firedRef.current.has(getRuleKey(rule))) continue;

        switch (rule.trigger_type) {
          case "score_gte":
            if (getVisitorScore && getVisitorScore() >= rule.value) fireRule(rule);
            break;
          case "time_on_page":
            if (elapsed >= rule.value) fireRule(rule);
            break;
          case "inactivity":
            if (inactivity >= rule.value) fireRule(rule);
            break;
        }
      }
    }, 3000);

    // Scroll-based triggers
    const handleScroll = () => {
      lastActivityRef.current = Date.now();
      const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const viewH = window.innerHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const pct = docH <= viewH ? 100 : Math.round(((scrollTop + viewH) / docH) * 100);

      for (const rule of activeRules) {
        if (rule.trigger_type === "scroll_pct" && pct >= rule.value) {
          fireRule(rule);
        }
      }
    };

    // Exit intent trigger
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        for (const rule of activeRules) {
          if (rule.trigger_type === "exit_intent") fireRule(rule);
        }
      }
    };

    // Track activity
    const handleActivity = () => { lastActivityRef.current = Date.now(); };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("click", handleActivity);
    document.addEventListener("keydown", handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("click", handleActivity);
      document.removeEventListener("keydown", handleActivity);
    };
  }, [enabled, rules, getVisitorScore, fireRule]);

  return { triggered, dismiss };
}
