import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Calendar, Clock, Gift, Zap, ArrowDown, Star, Play } from "lucide-react";

interface StepContent {
  headline?: string;
  subheadline?: string;
  body?: string;
  cta_text?: string;
  cta_url?: string;
  cta_color?: string;
  image_url?: string;
  images?: string[];
  countdown_target?: string;
  countdown_label?: string;
  booking_url?: string;
  booking_provider?: string;
  offer_title?: string;
  offer_original_price?: string;
  offer_price?: string;
  offer_features?: string[];
  bridge_destination_url?: string;
  bridge_delay_seconds?: number;
  testimonials?: { id: string; name: string; role: string; quote: string; avatar_url?: string; rating: number }[];
  video?: { url: string; autoplay: boolean; loop: boolean; muted: boolean; poster_url?: string; caption?: string };
}

interface RendererProps {
  content: StepContent;
  onCtaClick?: (label?: string) => void;
  onComplete?: () => void;
}

/* ──── THANKYOU ──── */
export function ThankYouRenderer({ content, onComplete }: RendererProps) {
  useEffect(() => { onComplete?.(); }, []);
  return (
    <div className="text-center py-12 space-y-6">
      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        {content.headline || "Obrigado!"}
      </h1>
      {content.subheadline && <p className="text-lg text-muted-foreground">{content.subheadline}</p>}
      {content.body && <p className="text-foreground/80 whitespace-pre-wrap max-w-lg mx-auto">{content.body}</p>}
      {content.cta_url && (
        <Button asChild size="lg" style={content.cta_color ? { backgroundColor: content.cta_color } : undefined}>
          <a href={content.cta_url} target="_blank" rel="noopener noreferrer">
            {content.cta_text || "Continuar"} <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      )}
    </div>
  );
}

/* ──── COUNTDOWN ──── */
export function CountdownRenderer({ content, onCtaClick }: RendererProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = content.countdown_target ? new Date(content.countdown_target).getTime() : Date.now() + 3600000;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [content.countdown_target]);

  return (
    <div className="text-center space-y-8">
      {content.headline && <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{content.headline}</h1>}
      {content.subheadline && <p className="text-lg text-muted-foreground">{content.subheadline}</p>}
      
      <div className="flex justify-center gap-4">
        {[
          { label: "Dias", value: timeLeft.days },
          { label: "Horas", value: timeLeft.hours },
          { label: "Min", value: timeLeft.minutes },
          { label: "Seg", value: timeLeft.seconds },
        ].map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 border-2 border-primary/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold text-primary">{String(unit.value).padStart(2, "0")}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1.5 font-medium">{unit.label}</span>
          </div>
        ))}
      </div>

      {content.countdown_label && <p className="text-sm font-medium text-muted-foreground"><Clock className="h-4 w-4 inline mr-1" />{content.countdown_label}</p>}
      {content.body && <p className="text-foreground/80 whitespace-pre-wrap">{content.body}</p>}
      
      {content.cta_url && (
        <Button asChild size="lg" onClick={() => onCtaClick?.(content.cta_text)} style={content.cta_color ? { backgroundColor: content.cta_color } : undefined}>
          <a href={content.cta_url} target="_blank" rel="noopener noreferrer">
            {content.cta_text || "Aproveitar agora"} <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      )}
    </div>
  );
}

/* ──── BOOKING ──── */
export function BookingRenderer({ content, onCtaClick }: RendererProps) {
  return (
    <div className="space-y-6">
      {content.headline && <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{content.headline}</h1>}
      {content.subheadline && <p className="text-lg text-muted-foreground">{content.subheadline}</p>}
      {content.body && <p className="text-foreground/80 whitespace-pre-wrap">{content.body}</p>}

      {content.booking_url ? (
        <div className="space-y-4">
          <div className="border rounded-xl overflow-hidden bg-muted/20">
            <iframe src={content.booking_url} className="w-full h-[500px]" title="Agendar" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            <Calendar className="h-3 w-3 inline mr-1" />
            Powered by {content.booking_provider || "Calendly"}
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">URL de agendamento não configurado</p>
        </div>
      )}
    </div>
  );
}

/* ──── UPSELL ──── */
export function UpsellRenderer({ content, onCtaClick }: RendererProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Zap className="h-3 w-3" /> Oferta Especial
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{content.headline || "Upgrade"}</h1>
        {content.subheadline && <p className="text-lg text-muted-foreground">{content.subheadline}</p>}
      </div>

      {content.offer_title && (
        <div className="border-2 border-primary/30 rounded-xl p-6 bg-primary/5 space-y-4">
          <h3 className="text-xl font-bold">{content.offer_title}</h3>
          {content.offer_original_price && (
            <div className="flex items-baseline gap-3">
              <span className="text-lg line-through text-muted-foreground">{content.offer_original_price}</span>
              <span className="text-3xl font-bold text-primary">{content.offer_price || "Grátis"}</span>
            </div>
          )}
          {content.offer_features && content.offer_features.length > 0 && (
            <ul className="space-y-2">
              {content.offer_features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {content.body && <p className="text-foreground/80 whitespace-pre-wrap">{content.body}</p>}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={() => onCtaClick?.(content.cta_text)} style={content.cta_color ? { backgroundColor: content.cta_color } : undefined}>
          {content.cta_text || "Sim, quero!"} <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

/* ──── DOWNSELL ──── */
export function DownsellRenderer({ content, onCtaClick }: RendererProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold mb-2">
          <Gift className="h-3 w-3" /> Última Oportunidade
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{content.headline || "Espere!"}</h1>
        {content.subheadline && <p className="text-lg text-muted-foreground">{content.subheadline}</p>}
      </div>

      {content.offer_title && (
        <div className="border rounded-xl p-6 bg-muted/30 space-y-4">
          <h3 className="text-xl font-bold">{content.offer_title}</h3>
          {content.offer_price && (
            <div className="flex items-baseline gap-3">
              {content.offer_original_price && <span className="text-lg line-through text-muted-foreground">{content.offer_original_price}</span>}
              <span className="text-3xl font-bold text-foreground">{content.offer_price}</span>
            </div>
          )}
          {content.offer_features && content.offer_features.length > 0 && (
            <ul className="space-y-2">
              {content.offer_features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {content.body && <p className="text-foreground/80 whitespace-pre-wrap">{content.body}</p>}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={() => onCtaClick?.(content.cta_text)} style={content.cta_color ? { backgroundColor: content.cta_color } : undefined}>
          {content.cta_text || "Aceitar esta oferta"} <ArrowDown className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

/* ──── BRIDGE ──── */
export function BridgeRenderer({ content, onCtaClick }: RendererProps) {
  const [countdown, setCountdown] = useState(content.bridge_delay_seconds || 5);

  useEffect(() => {
    if (countdown <= 0) {
      if (content.bridge_destination_url) {
        window.location.href = content.bridge_destination_url;
      }
      return;
    }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, content.bridge_destination_url]);

  return (
    <div className="text-center py-12 space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{content.headline || "A redirecionar..."}</h1>
      {content.subheadline && <p className="text-lg text-muted-foreground">{content.subheadline}</p>}
      {content.body && <p className="text-foreground/80 whitespace-pre-wrap">{content.body}</p>}

      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          A redirecionar em <span className="font-bold text-foreground">{countdown}</span> segundos...
        </p>
      </div>

      {content.bridge_destination_url && (
        <Button variant="outline" asChild onClick={() => onCtaClick?.(content.cta_text || "Ir agora")}>
          <a href={content.bridge_destination_url}>
            {content.cta_text || "Ir agora"} <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      )}
    </div>
  );
}
