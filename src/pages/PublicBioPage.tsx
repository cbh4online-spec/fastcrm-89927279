import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, MessageCircle, Play, ChevronDown, ChevronUp, Quote, Clock, Star, ArrowRight } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface BioPage {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  primary_color: string;
  background_style: Record<string, any> | null;
  custom_css: string | null;
}

interface BioBlock {
  id: string;
  block_type: string;
  content: Record<string, any>;
  order_index: number;
  is_visible: boolean;
}

function getContrastColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function hexToRgb(hex: string) {
  const c = hex.replace("#", "");
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}

// Dynamic Lucide icon component
function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} style={style} />;
}

// Track page view (fire-and-forget)
function trackPageView(page: BioPage) {
  const visitorId = localStorage.getItem("bio_visitor_id") || crypto.randomUUID();
  localStorage.setItem("bio_visitor_id", visitorId);

  const params = new URLSearchParams(window.location.search);
  const utmJson: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
    const v = params.get(k);
    if (v) utmJson[k] = v;
  });

  supabase.from("bio_events").insert({
    workspace_id: page.workspace_id,
    bio_page_id: page.id,
    event_type: "page_view",
    visitor_id: visitorId,
    referrer: document.referrer || null,
    device: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    source: params.get("utm_source") || (document.referrer ? new URL(document.referrer).hostname : null),
    utm_json: Object.keys(utmJson).length > 0 ? utmJson : null,
  } as any).then(() => {});
}

// Track block click
function trackBlockClick(page: BioPage, blockId: string) {
  const visitorId = localStorage.getItem("bio_visitor_id") || crypto.randomUUID();
  supabase.from("bio_events").insert({
    workspace_id: page.workspace_id,
    bio_page_id: page.id,
    block_id: blockId,
    event_type: "click",
    visitor_id: visitorId,
    device: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
  } as any).then(() => {});
}

// ─── Block Renderers ────────────────────────────────────────

function HeroBlock({ block, primaryColor, contrastColor, index }: { block: BioBlock; primaryColor: string; contrastColor: string; index: number }) {
  const { title, subtitle, cta_text, cta_url, icon, bg_image, gradient_variant } = block.content;
  const rgb = hexToRgb(primaryColor);
  const variantIndex = gradient_variant ?? index;

  // Generate gradient similar to preview card
  const hsl = (() => {
    const c = primaryColor.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  })();

  const GRADIENT_VARIANTS = [
    (h: number, s: number, l: number) => `linear-gradient(135deg, hsl(${h}, ${s}%, ${l}%) 0%, hsl(${(h + 15) % 360}, ${Math.min(s + 10, 100)}%, ${Math.max(l - 15, 10)}%) 100%)`,
    (h: number, s: number, l: number) => `linear-gradient(160deg, hsl(${(h + 30) % 360}, ${Math.min(s + 5, 100)}%, ${Math.min(l + 5, 85)}%) 0%, hsl(${(h + 45) % 360}, ${s}%, ${Math.max(l - 10, 15)}%) 100%)`,
    (h: number, s: number, l: number) => `linear-gradient(45deg, hsl(${(h + 70) % 360}, ${Math.min(s + 15, 100)}%, ${l}%) 0%, hsl(${(h + 90) % 360}, ${s}%, ${Math.min(l + 5, 85)}%) 100%)`,
    (h: number, s: number, l: number) => `linear-gradient(180deg, hsl(${(h - 30 + 360) % 360}, ${s}%, ${Math.min(l + 10, 85)}%) 0%, hsl(${h}, ${Math.min(s + 20, 100)}%, ${Math.max(l - 10, 15)}%) 100%)`,
    (h: number, s: number, l: number) => `linear-gradient(120deg, hsl(${(h + 130) % 360}, ${Math.max(s - 10, 30)}%, ${l}%) 0%, hsl(${(h + 150) % 360}, ${s}%, ${Math.max(l - 5, 20)}%) 100%)`,
  ];

  const gradientFn = GRADIENT_VARIANTS[variantIndex % GRADIENT_VARIANTS.length];
  const gradient = gradientFn(hsl.h, hsl.s, hsl.l);
  const iconGradient = `linear-gradient(135deg, hsl(${hsl.h}, ${Math.min(hsl.s + 10, 100)}%, ${Math.min(hsl.l + 10, 80)}%) 0%, hsl(${(hsl.h + 20) % 360}, ${hsl.s}%, ${Math.max(hsl.l - 10, 20)}%) 100%)`;

  const cardStyle: React.CSSProperties = {
    background: bg_image ? undefined : gradient,
    backgroundImage: bg_image ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${bg_image})` : undefined,
    backgroundSize: bg_image ? "cover" : undefined,
    backgroundPosition: bg_image ? "center" : undefined,
  };

  const textColor = bg_image ? "#fff" : (hsl.l > 55 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)");
  const subtleTextColor = bg_image ? "rgba(255,255,255,0.8)" : (hsl.l > 55 ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)");
  const btnBg = bg_image ? "#fff" : textColor;
  const btnColor = bg_image ? "#000" : primaryColor;

  return (
    <div className="rounded-3xl p-6 pt-4 shadow-lg text-center" style={cardStyle}>
      {(() => {
        const heroMediaType = block.content.hero_media_type || "icon";
        const heroImage = block.content.hero_image;

        if (heroMediaType === "avatar" && heroImage) {
          return (
            <div className="mx-auto -mt-6 mb-4 flex h-20 w-20 items-center justify-center rounded-full backdrop-blur-sm"
              style={{ border: `3px solid ${primaryColor}25`, boxShadow: `0 0 30px 8px ${primaryColor}20` }}
            >
              <img src={heroImage} alt="Avatar" className="h-14 w-14 rounded-full object-cover shadow-2xl" style={{ boxShadow: `0 8px 25px -3px ${primaryColor}50` }} />
            </div>
          );
        }
        if (heroMediaType === "logo" && heroImage) {
          return (
            <div className="mx-auto -mt-4 mb-4 flex items-center justify-center">
              <img src={heroImage} alt="Logo" className="h-16 max-w-[160px] object-contain rounded-lg drop-shadow-lg" />
            </div>
          );
        }
        // Default: icon
        if (icon) {
          return (
            <div className="mx-auto -mt-6 mb-4 flex h-20 w-20 items-center justify-center rounded-full backdrop-blur-sm"
              style={{ border: `3px solid ${primaryColor}25`, boxShadow: `0 0 30px 8px ${primaryColor}20` }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full shadow-2xl"
                style={{
                  background: bg_image ? "rgba(255,255,255,0.2)" : iconGradient,
                  boxShadow: `inset 0 -3px 6px rgba(0,0,0,0.15), 0 8px 25px -3px ${primaryColor}50, 0 0 40px 5px ${primaryColor}30`,
                }}
              >
                <DynamicIcon name={icon} className="h-8 w-8 drop-shadow-lg" style={{ color: "#fff" }} />
              </div>
            </div>
          );
        }
        return null;
      })()}
      <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-2" style={{ color: textColor }}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm md:text-base mb-5 leading-relaxed max-w-md mx-auto" style={{ color: subtleTextColor }}>
          {subtitle}
        </p>
      )}
      {cta_text && cta_url && (
        <a
          href={cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-md transition-transform hover:scale-105"
          style={{ backgroundColor: btnBg, color: btnColor }}
        >
          {cta_text}
          <ArrowRight className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function LinkBlock({ block, primaryColor, contrastColor, onTrack }: { block: BioBlock; primaryColor: string; contrastColor: string; onTrack: () => void }) {
  const { text, url, icon } = block.content;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onTrack}
      className="flex items-center justify-between w-full px-5 py-4 rounded-xl font-medium transition-all hover:scale-[1.02] hover:shadow-lg"
      style={{ backgroundColor: primaryColor, color: contrastColor }}
    >
      <div className="flex items-center gap-3">
        {icon && <DynamicIcon name={icon} className="w-5 h-5" />}
        <span>{text}</span>
      </div>
      <ExternalLink className="w-4 h-4 opacity-60" />
    </a>
  );
}

function ButtonBlock({ block, primaryColor, contrastColor, onTrack }: { block: BioBlock; primaryColor: string; contrastColor: string; onTrack: () => void }) {
  const { text, url, icon, variant } = block.content;
  const isOutline = variant === "outline";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onTrack}
      className="flex items-center justify-center gap-2 w-full px-5 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02]"
      style={
        isOutline
          ? { border: `2px solid ${primaryColor}`, color: primaryColor, backgroundColor: "transparent" }
          : { backgroundColor: primaryColor, color: contrastColor }
      }
    >
      {icon && <DynamicIcon name={icon} className="w-5 h-5" />}
      <span>{text}</span>
    </a>
  );
}

function TextBlock({ block }: { block: BioBlock }) {
  const { text, align = "center", size = "base" } = block.content;
  const sizeClass = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";
  return (
    <p className={`${sizeClass} text-white/90 leading-relaxed`} style={{ textAlign: align }}>
      {text}
    </p>
  );
}

function ImageBlock({ block }: { block: BioBlock }) {
  const { url, alt, link } = block.content;
  const img = <img src={url} alt={alt || ""} className="w-full rounded-xl" loading="lazy" />;
  if (link) return <a href={link} target="_blank" rel="noopener noreferrer">{img}</a>;
  return img;
}

function WhatsAppBlock({ block, onTrack }: { block: BioBlock; onTrack: () => void }) {
  const { phone, message, text = "Contactar via WhatsApp" } = block.content;
  const waUrl = `https://wa.me/${phone?.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onTrack}
      className="flex items-center justify-center gap-3 w-full px-5 py-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
      style={{ backgroundColor: "#25D366" }}
    >
      <MessageCircle className="w-5 h-5" />
      <span>{text}</span>
    </a>
  );
}

function SocialBlock({ block, primaryColor }: { block: BioBlock; primaryColor: string }) {
  const content = block.content;
  
  // Build social map: support both direct keys (content.instagram) and links array format
  const socialMap: Record<string, string> = {};
  const platformDefs = [
    { key: "instagram", icon: "Instagram", prefix: "https://instagram.com/" },
    { key: "facebook", icon: "Facebook", prefix: "https://facebook.com/" },
    { key: "linkedin", icon: "Linkedin", prefix: "https://linkedin.com/in/" },
    { key: "twitter", icon: "Twitter", prefix: "https://twitter.com/" },
    { key: "youtube", icon: "Youtube", prefix: "https://youtube.com/" },
    { key: "tiktok", icon: "Music2", prefix: "https://tiktok.com/@" },
    { key: "spotify", icon: "Music", prefix: "https://open.spotify.com/" },
    { key: "dribbble", icon: "Dribbble", prefix: "https://dribbble.com/" },
    { key: "website", icon: "Globe", prefix: "" },
  ];

  // Direct keys
  platformDefs.forEach(p => { if (content[p.key]) socialMap[p.key] = content[p.key]; });
  
  // Links array format
  if (Array.isArray(content.links)) {
    content.links.forEach((link: any) => {
      if (link.platform && link.url) socialMap[link.platform] = link.url;
    });
  }

  const socials = platformDefs.filter(p => socialMap[p.key]);

  return (
    <div>
      {content.title && <p className="text-white/60 text-xs text-center mb-3 font-medium">{content.title}</p>}
      <div className="flex items-center justify-center gap-4 py-2">
        {socials.map((s) => (
          <a
            key={s.key}
            href={socialMap[s.key].startsWith("http") ? socialMap[s.key] : s.prefix + socialMap[s.key]}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: primaryColor + "30" }}
          >
            <DynamicIcon name={s.icon} className="w-5 h-5 text-white" />
          </a>
        ))}
      </div>
    </div>
  );
}

function DividerBlock({ block, primaryColor }: { block: BioBlock; primaryColor: string }) {
  const style = block.content.style || "line";
  if (style === "space") return <div className="h-6" />;
  if (style === "dots") return <div className="flex justify-center gap-2 py-3">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor + "50" }} />)}</div>;
  return <hr className="border-t border-white/20 my-2" />;
}

function VideoBlock({ block }: { block: BioBlock }) {
  const { url } = block.content;
  let embedUrl = url;
  const ytMatch = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url?.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden">
      <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
    </div>
  );
}

function FAQBlock({ block, primaryColor }: { block: BioBlock; primaryColor: string }) {
  const content = block.content;
  const items = content.items || (content.question ? [{ question: content.question, answer: content.answer }] : []);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2 w-full">
      {items.map((item: any, i: number) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left text-white font-medium"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span>{item.question}</span>
            {openIndex === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openIndex === i && (
            <div className="px-4 pb-3 text-white/70 text-sm">{item.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function TestimonialsBlock({ block, primaryColor }: { block: BioBlock; primaryColor: string }) {
  const content = block.content;
  const items = content.items || (content.text ? [{ text: content.text, author: content.author }] : []);
  return (
    <div className="space-y-3 w-full">
      {items.map((item: any, i: number) => (
        <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-start gap-3">
            <Quote className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
            <div>
              <p className="text-white/90 text-sm italic mb-2">"{item.text}"</p>
              <p className="text-white/60 text-xs font-medium">{item.author}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CountdownBlock({ block, primaryColor, contrastColor }: { block: BioBlock; primaryColor: string; contrastColor: string }) {
  const { target_date, label } = block.content;
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(target_date).getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [target_date]);

  return (
    <div className="text-center w-full">
      {label && <p className="text-white/80 text-sm mb-3">{label}</p>}
      <div className="flex justify-center gap-3">
        {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
          <div key={unit} className="rounded-xl px-3 py-2 min-w-[60px]" style={{ backgroundColor: primaryColor + "30" }}>
            <div className="text-xl font-bold text-white">{timeLeft[unit]}</div>
            <div className="text-[10px] text-white/50 uppercase">{unit === "days" ? "Dias" : unit === "hours" ? "Hrs" : unit === "minutes" ? "Min" : "Seg"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureBlock({ block, primaryColor }: { block: BioBlock; primaryColor: string }) {
  const { title, description, subtitle, icon, items = [], cta_text, cta_url } = block.content;
  const featureDescription = description || subtitle;
  return (
    <div className="w-full rounded-xl p-5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-3">
          {icon && <DynamicIcon name={icon} className="w-6 h-6" style={{ color: primaryColor }} />}
          {title && <h3 className="text-white font-semibold text-lg">{title}</h3>}
        </div>
      )}
      {featureDescription && <p className="text-white/70 text-sm mb-3">{featureDescription}</p>}
      {cta_text && (
        <a href={cta_url || "#"} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold mb-3 transition-opacity hover:opacity-80"
          style={{ color: primaryColor }}
        >
          {cta_text} <ArrowRight className="w-3 h-3" />
        </a>
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item: any, i: number) => (
            <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
              <Star className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
              <span>{typeof item === "string" ? item : item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormBlock({ block, page, primaryColor, contrastColor }: { block: BioBlock; page: BioPage; primaryColor: string; contrastColor: string }) {
  const { title, fields = ["name", "email"], button_text = "Enviar", success_message = "Obrigado!" } = block.content;
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Track lead event
      const visitorId = localStorage.getItem("bio_visitor_id") || crypto.randomUUID();
      await supabase.from("bio_events").insert({
        workspace_id: page.workspace_id,
        bio_page_id: page.id,
        block_id: block.id,
        event_type: "lead",
        visitor_id: visitorId,
        device: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
      } as any);

      // Try to create contact in CRM
      if (formData.email || formData.phone) {
        await supabase.from("contacts").insert({
          workspace_id: page.workspace_id,
          first_name: formData.name?.split(" ")[0] || "",
          last_name: formData.name?.split(" ").slice(1).join(" ") || "",
          email: formData.email || null,
          phone: formData.phone || null,
          source: "bio_page",
          notes: `Via Bio: ${page.name}`,
        } as any);
      }

      setSubmitted(true);
    } catch {
      // silent fail for public page
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-6 px-4 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
        <p className="text-white font-medium">{success_message}</p>
      </div>
    );
  }

  const fieldLabels: Record<string, string> = { name: "Nome", email: "Email", phone: "Telefone", message: "Mensagem" };

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-xl p-5 space-y-3" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
      {title && <h3 className="text-white font-semibold text-center mb-2">{title}</h3>}
      {fields.map((field: string) => (
        <input
          key={field}
          type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
          placeholder={fieldLabels[field] || field}
          required={field === "email" || field === "name"}
          value={formData[field] || ""}
          onChange={(e) => setFormData((d) => ({ ...d, [field]: e.target.value }))}
          className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
        />
      ))}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{ backgroundColor: primaryColor, color: contrastColor }}
      >
        {loading ? "..." : button_text}
      </button>
    </form>
  );
}

function CalendarBlock({ block, primaryColor, contrastColor }: { block: BioBlock; primaryColor: string; contrastColor: string }) {
  const { url, text = "Agendar reunião" } = block.content;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-3 w-full px-5 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02]"
      style={{ backgroundColor: primaryColor, color: contrastColor }}
    >
      <Clock className="w-5 h-5" />
      <span>{text}</span>
    </a>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function PublicBioPage() {
  const { workspaceSlug, pageSlug } = useParams<{ workspaceSlug: string; pageSlug: string }>();
  const [page, setPage] = useState<BioPage | null>(null);
  const [blocks, setBlocks] = useState<BioBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const primaryColor = page?.primary_color || "#6366f1";
  const contrastColor = useMemo(() => getContrastColor(primaryColor), [primaryColor]);
  const rgb = useMemo(() => hexToRgb(primaryColor), [primaryColor]);

  useEffect(() => {
    if (!workspaceSlug || !pageSlug) { setNotFound(true); setLoading(false); return; }

    (async () => {
      // Resolve workspace by slug first
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();

      if (wsError || !workspace) { setNotFound(true); setLoading(false); return; }

      const { data: pageData, error: pageError } = await supabase
        .from("bio_pages")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("slug", pageSlug)
        .eq("status", "live")
        .maybeSingle();

      if (pageError || !pageData) { setNotFound(true); setLoading(false); return; }

      setPage(pageData as any);

      const { data: blocksData } = await supabase
        .from("bio_blocks")
        .select("*")
        .eq("bio_page_id", pageData.id)
        .eq("is_visible", true)
        .order("order_index", { ascending: true });

      setBlocks((blocksData || []) as any);
      setLoading(false);

      trackPageView(pageData as any);
    })();
  }, [workspaceSlug, pageSlug]);

  // Background style
  const bgStyle = useMemo(() => {
    const bg = page?.background_style;
    if (!bg) return { background: `linear-gradient(135deg, #0f0f23 0%, ${primaryColor}22 50%, #0f0f23 100%)` };
    if (bg.type === "gradient" && bg.value) return { background: bg.value };
    if (bg.type === "color" && bg.value) return { backgroundColor: bg.value };
    if (bg.type === "image" && bg.value) return { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" };
    return { background: `linear-gradient(135deg, #0f0f23 0%, ${primaryColor}22 50%, #0f0f23 100%)` };
  }, [page?.background_style, primaryColor]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f23" }}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0f0f23" }}>
        <div className="text-6xl font-bold text-white/20">404</div>
        <p className="text-white/50">Página não encontrada</p>
      </div>
    );
  }

  const renderBlock = (block: BioBlock, blockIndex: number) => {
    const onTrack = () => trackBlockClick(page, block.id);
    switch (block.block_type) {
      case "hero": return <HeroBlock block={block} primaryColor={primaryColor} contrastColor={contrastColor} index={blockIndex} />;
      case "link": return <LinkBlock block={block} primaryColor={primaryColor} contrastColor={contrastColor} onTrack={onTrack} />;
      case "button": return <ButtonBlock block={block} primaryColor={primaryColor} contrastColor={contrastColor} onTrack={onTrack} />;
      case "text": return <TextBlock block={block} />;
      case "image": return <ImageBlock block={block} />;
      case "whatsapp": return <WhatsAppBlock block={block} onTrack={onTrack} />;
      case "social": return <SocialBlock block={block} primaryColor={primaryColor} />;
      case "divider": return <DividerBlock block={block} primaryColor={primaryColor} />;
      case "video": return <VideoBlock block={block} />;
      case "faq": return <FAQBlock block={block} primaryColor={primaryColor} />;
      case "testimonials": return <TestimonialsBlock block={block} primaryColor={primaryColor} />;
      case "countdown": return <CountdownBlock block={block} primaryColor={primaryColor} contrastColor={contrastColor} />;
      case "feature": return <FeatureBlock block={block} primaryColor={primaryColor} />;
      case "form": return <FormBlock block={block} page={page} primaryColor={primaryColor} contrastColor={contrastColor} />;
      case "calendar": return <CalendarBlock block={block} primaryColor={primaryColor} contrastColor={contrastColor} />;
      default: return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>{page.seo_title || page.name}</title>
        {page.seo_description && <meta name="description" content={page.seo_description} />}
        {page.og_image && <meta property="og:image" content={page.og_image} />}
        <meta property="og:title" content={page.seo_title || page.name} />
        {page.seo_description && <meta property="og:description" content={page.seo_description} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>

      <div className="min-h-screen" style={bgStyle}>
        {page.custom_css && <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />}

        <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
          {blocks.map((block, i) => (
            <div key={block.id}>{renderBlock(block, i)}</div>
          ))}
        </div>

        {/* Subtle branding */}
        <div className="text-center pb-6">
          <span className="text-white/20 text-xs">Powered by FastCRM</span>
        </div>
      </div>
    </>
  );
}
