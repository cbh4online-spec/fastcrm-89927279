import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useExitIntent } from "@/hooks/useExitIntent";
import { cn } from "@/lib/utils";

interface PopupRule {
  id: string;
  trigger_type: string;
  trigger_value: number | string | null;
  popup_type: string;
  content: Record<string, unknown>;
  max_shows_per_session: number;
  target_pages: string[];
}

interface Props {
  workspaceId?: string;
  currentPage?: string;
}

const SESSION_KEY = "smart_popup_shown";

function getShownPopups(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch { return {}; }
}

function markShown(ruleId: string) {
  const shown = getShownPopups();
  shown[ruleId] = (shown[ruleId] || 0) + 1;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(shown));
}

export function SmartPopupEngine({ workspaceId, currentPage }: Props) {
  const [rules, setRules] = useState<PopupRule[]>([]);
  const [activePopup, setActivePopup] = useState<PopupRule | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [surveyAnswer, setSurveyAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const startTime = useRef(Date.now());
  const scrollRef = useRef(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>();
  const { triggered: exitIntent } = useExitIntent();

  // Fetch rules
  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("popup_rules")
      .select("id, trigger_type, trigger_value, popup_type, content, max_shows_per_session, target_pages")
      .eq("workspace_id", workspaceId)
      .eq("enabled", true)
      .then(({ data, error }) => {
        if (error) {
          console.error("[SmartPopupEngine] Failed to fetch rules:", error.message);
          return;
        }
        if (data) setRules(data);
      });
  }, [workspaceId]);

  // Track scroll
  useEffect(() => {
    const handler = () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      scrollRef.current = Math.max(scrollRef.current, pct);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const evaluateRules = useCallback(() => {
    if (activePopup || dismissed) return;
    const shown = getShownPopups();
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (const rule of rules) {
      // Check max shows
      if ((shown[rule.id] || 0) >= (rule.max_shows_per_session || 1)) continue;

      // Check target pages
      if (rule.target_pages?.length > 0 && currentPage) {
        const matches = rule.target_pages.some(p => currentPage.includes(p) || p === "*");
        if (!matches) continue;
      }

      let triggered = false;
      switch (rule.trigger_type) {
        case "exit_intent":
          triggered = exitIntent;
          break;
        case "scroll_pct":
          triggered = scrollRef.current >= (rule.trigger_value?.pct || 50);
          break;
        case "time_on_page":
          triggered = elapsed >= (rule.trigger_value?.seconds || 30);
          break;
        case "inactivity":
          // handled separately
          break;
      }

      if (triggered) {
        setActivePopup(rule);
        markShown(rule.id);
        return;
      }
    }
  }, [rules, activePopup, dismissed, exitIntent, currentPage]);

  // Evaluate periodically
  useEffect(() => {
    const interval = setInterval(evaluateRules, 2000);
    return () => clearInterval(interval);
  }, [evaluateRules]);

  // Inactivity trigger
  useEffect(() => {
    const inactivityRules = rules.filter(r => r.trigger_type === "inactivity");
    if (inactivityRules.length === 0) return;

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      const rule = inactivityRules[0];
      const seconds = rule.trigger_value?.seconds || 30;
      inactivityTimer.current = setTimeout(() => {
        if (!activePopup && !dismissed) {
          const shown = getShownPopups();
          if ((shown[rule.id] || 0) < (rule.max_shows_per_session || 1)) {
            setActivePopup(rule);
            markShown(rule.id);
          }
        }
      }, seconds * 1000);
    };

    const events = ["mousemove", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [rules, activePopup, dismissed]);

  const handleDismiss = () => {
    setActivePopup(null);
    setDismissed(true);
    setSubmitted(false);
    setEmail("");
    setSurveyAnswer("");
  };

  const handleSubmit = async () => {
    if (!activePopup || !workspaceId) return;
    const sessionId = localStorage.getItem("vertical_landing_session_id") || "";
    await supabase.from("popup_responses").insert({
      workspace_id: workspaceId,
      rule_id: activePopup.id,
      session_id: sessionId,
      response_data: {
        email: email || null,
        answer: surveyAnswer || null,
        popup_type: activePopup.popup_type,
      },
      page_url: window.location.pathname,
      device_type: window.innerWidth < 768 ? "mobile" : "desktop",
    });
    setSubmitted(true);
    setTimeout(handleDismiss, 2000);
  };

  if (!activePopup) return null;

  const content = activePopup.content || {};

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-300">
      <div className={cn(
        "relative w-[90vw] max-w-md bg-background border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300",
        "space-y-4"
      )}>
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-lg font-semibold text-emerald-400">Obrigado! ✓</p>
            <p className="text-sm text-muted-foreground">{content.success_message || "Resposta registada."}</p>
          </div>
        ) : (
          <>
            {content.title && (
              <h3 className="text-lg font-bold pr-8">{content.title}</h3>
            )}
            {content.description && (
              <p className="text-sm text-muted-foreground">{content.description}</p>
            )}

            {/* CTA / Newsletter type */}
            {(activePopup.popup_type === "cta" || activePopup.popup_type === "newsletter") && (
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="O seu email..."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <Button onClick={handleSubmit} className="w-full" disabled={!email}>
                  {content.cta_text || "Subscrever"}
                </Button>
              </div>
            )}

            {/* Discount type */}
            {activePopup.popup_type === "discount" && (
              <div className="space-y-3">
                {content.discount_code && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">O seu código:</p>
                    <p className="text-xl font-bold text-primary tracking-wider">{content.discount_code}</p>
                  </div>
                )}
                <Input
                  type="email"
                  placeholder="Email para receber o desconto..."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <Button onClick={handleSubmit} className="w-full" disabled={!email}>
                  {content.cta_text || "Quero o desconto"}
                </Button>
              </div>
            )}

            {/* Survey type */}
            {activePopup.popup_type === "survey" && (
              <div className="space-y-3">
                {content.question && (
                  <p className="text-sm font-medium">{content.question}</p>
                )}
                {content.options?.length > 0 ? (
                  <div className="space-y-2">
                    {content.options.map((opt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSurveyAnswer(opt)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors",
                          surveyAnswer === opt
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                    <Button onClick={handleSubmit} className="w-full" disabled={!surveyAnswer}>
                      Enviar resposta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="A sua resposta..."
                      value={surveyAnswer}
                      onChange={e => setSurveyAnswer(e.target.value)}
                    />
                    <Button onClick={handleSubmit} className="w-full" disabled={!surveyAnswer}>
                      Enviar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
