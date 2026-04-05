import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "store_cookie_consent";

type ConsentValue = "accepted" | "rejected" | "custom";

interface ConsentState {
  value: ConsentValue;
  analytics: boolean;
  marketing: boolean;
}

function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeConsent(state: ConsentState) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

export function StoreCookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    storeConsent({ value: "accepted", analytics: true, marketing: true });
    setVisible(false);
  };

  const handleRejectAll = () => {
    storeConsent({ value: "rejected", analytics: false, marketing: false });
    setVisible(false);
  };

  const handleSaveCustom = () => {
    storeConsent({ value: "custom", analytics, marketing });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 pointer-events-none">
      <div className="container mx-auto max-w-2xl pointer-events-auto">
        <div className="bg-background border rounded-xl shadow-lg p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Utilizamos cookies
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este site utiliza cookies essenciais para o seu funcionamento e cookies opcionais para
                análise e marketing. Pode aceitar todos, rejeitar os opcionais ou personalizar as suas
                preferências. Consulte a nossa{" "}
                <Link to="/cookies" className="underline hover:text-foreground">
                  Política de Cookies
                </Link>{" "}
                e{" "}
                <Link to="/privacy" className="underline hover:text-foreground">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          </div>

          {showCustom && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked disabled className="accent-primary" />
                <span className="font-medium text-foreground">Necessários</span>
                <span className="text-muted-foreground">(sempre ativos)</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="accent-primary"
                />
                <span className="font-medium text-foreground">Analytics</span>
                <span className="text-muted-foreground">— análise de utilização</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="accent-primary"
                />
                <span className="font-medium text-foreground">Marketing</span>
                <span className="text-muted-foreground">— anúncios relevantes</span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleAcceptAll}>
              Aceitar Todos
            </Button>
            <Button size="sm" variant="outline" onClick={handleRejectAll}>
              Rejeitar Opcionais
            </Button>
            {!showCustom ? (
              <Button size="sm" variant="ghost" onClick={() => setShowCustom(true)}>
                Personalizar
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleSaveCustom}>
                Guardar Preferências
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
