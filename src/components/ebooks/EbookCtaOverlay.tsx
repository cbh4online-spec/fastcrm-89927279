import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageCircle, Calendar, Mail, ArrowRight } from "lucide-react";
import { trackCtaEvent, type EbookCta } from "@/hooks/useEbookCtas";

interface EbookCtaOverlayProps {
  ctas: EbookCta[];
  position: "end" | "inline" | string;
  ebookId: string;
  workspaceId: string;
  viewId?: string;
  contactId?: string;
  chapterId?: string;
}

const CTA_ICONS: Record<string, typeof ExternalLink> = {
  link: ExternalLink,
  external_link: ExternalLink,
  whatsapp: MessageCircle,
  booking: Calendar,
  schedule: Calendar,
  contact: Mail,
  internal: ArrowRight,
  form: ArrowRight,
};

function getCtaUrl(cta: EbookCta): string | null {
  if (cta.cta_type === "whatsapp") {
    const num = (cta as any).whatsapp_number || cta.target_url;
    if (num) return `https://wa.me/${num.replace(/\D/g, "")}`;
    return null;
  }
  if (cta.cta_type === "booking" || cta.cta_type === "schedule") {
    return (cta as any).booking_link || cta.target_url || null;
  }
  return cta.target_url || (cta as any).target_route || null;
}

export function EbookCtaOverlay({
  ctas, position, ebookId, workspaceId, viewId, contactId, chapterId,
}: EbookCtaOverlayProps) {
  const impressionSent = useRef<Set<string>>(new Set());

  const activeCtas = ctas.filter(c =>
    c.is_active && (c.position === position || (position === "end" && c.position === "end"))
  );

  // Send impression events
  useEffect(() => {
    activeCtas.forEach(cta => {
      if (!impressionSent.current.has(cta.id)) {
        impressionSent.current.add(cta.id);
        trackCtaEvent({
          ebook_id: ebookId,
          cta_id: cta.id,
          view_id: viewId,
          workspace_id: workspaceId,
          chapter_id: chapterId,
          event_type: "cta_impression",
          contact_id: contactId,
        });
      }
    });
  }, [activeCtas.length]);

  const handleClick = useCallback((cta: EbookCta) => {
    trackCtaEvent({
      ebook_id: ebookId,
      cta_id: cta.id,
      view_id: viewId,
      workspace_id: workspaceId,
      chapter_id: chapterId,
      event_type: "cta_click",
      contact_id: contactId,
    });

    const url = getCtaUrl(cta);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, [ebookId, workspaceId, viewId, contactId, chapterId]);

  if (activeCtas.length === 0) return null;

  const variant = (activeCtas[0] as any).style_variant || "default";

  return (
    <div className={`flex flex-col items-center gap-3 py-6 px-4 ${
      variant === "prominent" ? "bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 my-4" :
      variant === "subtle" ? "my-2" :
      "bg-white/5 rounded-lg border border-white/10 my-4 p-4"
    }`}>
      {activeCtas.map(cta => {
        const Icon = CTA_ICONS[cta.cta_type] || ExternalLink;
        return (
          <Button
            key={cta.id}
            onClick={() => handleClick(cta)}
            className={`gap-2 ${
              variant === "prominent" ? "bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base" :
              variant === "subtle" ? "variant-ghost text-sm" :
              "bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-2.5"
            }`}
            size={variant === "prominent" ? "lg" : "default"}
          >
            <Icon className="h-4 w-4" />
            {cta.label}
          </Button>
        );
      })}
    </div>
  );
}
