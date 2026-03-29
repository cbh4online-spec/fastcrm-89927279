import ReactMarkdown from "react-markdown";
import { Mail, Phone, Globe, ExternalLink } from "lucide-react";

function isHtmlContent(content: string): boolean {
  return /<(p|h[1-6]|div|ul|ol|blockquote|table|figure|img|br|hr)\b/i.test(content);
}

export interface ContactPageData {
  email?: string;
  phone?: string;
  website?: string;
  slogan?: string;
  logo_url?: string;
  social_links?: { label: string; url: string }[];
}

export type FlipbookPageData =
  | { type: "cover"; title: string; subtitle?: string; author?: string; coverUrl?: string }
  | { type: "toc"; chapters: { title: string; pageStart: number }[] }
  | { type: "chapter-title"; chapterIndex: number; title: string; coverImage?: string }
  | { type: "content"; chapterIndex: number; chapterTitle: string; content: string; pageNumber: number; totalPages: number; headerText?: string; footerText?: string }
  | { type: "contact"; contactData: ContactPageData; title: string };

export interface HighlightMark {
  text: string;
  color: string;
}

interface FlipbookPageProps {
  page: FlipbookPageData;
  pageWidth?: number;
  pageHeight?: number;
  onGoToPage?: (page: number) => void;
  highlights?: HighlightMark[];
}

function useScaleFactor(pageHeight?: number) {
  const h = pageHeight ?? 600;
  const scale = h / 600;
  const baseFontSize = Math.max(12, Math.min(22, 14 * scale));
  return { baseFontSize, scale };
}

/* ── CSS variable shorthands (with safe fallbacks) ── */
const v = {
  primary: "var(--ebook-primary, #0f172a)",
  accent: "var(--ebook-accent, #b4884e)",
  bg: "var(--ebook-bg, #fefcf9)",
  headingFont: "var(--ebook-heading-font, Georgia, serif)",
  bodyFont: "var(--ebook-body-font, Georgia, serif)",
};

/** Apply highlight marks to HTML content string */
function applyHighlightsToHtml(html: string, highlights?: HighlightMark[]): string {
  if (!highlights || highlights.length === 0) return html;
  let result = html;
  for (const hl of highlights) {
    if (!hl.text || hl.text.length < 2) continue;
    const escaped = hl.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?![^<]*>)(${escaped})`, "gi");
    const markStyle = `background-color:${hl.color}40;border-bottom:2px solid ${hl.color};border-radius:2px;padding:0 2px`;
    result = result.replace(regex, `<mark style="${markStyle}" title="Sublinhado">$1</mark>`);
  }
  return result;
}

/** Apply highlight marks to plain/markdown text by wrapping in spans (rendered via dangerouslySetInnerHTML) */
function applyHighlightsToText(text: string, highlights?: HighlightMark[]): string | null {
  if (!highlights || highlights.length === 0) return null;
  let result = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const hl of highlights) {
    if (!hl.text || hl.text.length < 2) continue;
    const escaped = hl.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const markStyle = `background-color:${hl.color}40;border-bottom:2px solid ${hl.color};border-radius:2px;padding:0 2px`;
    result = result.replace(regex, `<mark style="${markStyle}" title="Sublinhado">$1</mark>`);
  }
  return result !== text ? result : null;
}

export function FlipbookPage({ page, pageWidth, pageHeight, onGoToPage, highlights }: FlipbookPageProps) {
  const { baseFontSize } = useScaleFactor(pageHeight);
  const baseStyle = { fontSize: `${baseFontSize}px` };

  /* ─── COVER ─── */
  if (page.type === "cover") {
    return (
      <div
        className="w-full h-full min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden"
        style={{ ...baseStyle, background: v.primary }}
      >
        {page.coverUrl ? (
          <>
            <img src={page.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
        )}
        <div className="relative z-10 text-center px-[2em] max-w-full overflow-hidden">
          <div className="w-[4em] h-[2px] mx-auto mb-[1.4em] opacity-60" style={{ backgroundColor: v.accent }} />
          <h1
            className="font-bold text-white leading-tight mb-[0.6em] drop-shadow-lg break-words"
            style={{ fontSize: "2.2em", fontFamily: v.headingFont }}
          >
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-white/70 italic mb-[0.8em] break-words" style={{ fontSize: "0.85em", fontFamily: v.bodyFont }}>
              {page.subtitle}
            </p>
          )}
          {page.author && (
            <p className="tracking-widest uppercase mt-[1em] opacity-80" style={{ fontSize: "0.65em", color: v.accent }}>
              {page.author}
            </p>
          )}
          <div className="w-[4em] h-[2px] mx-auto mt-[1.4em] opacity-60" style={{ backgroundColor: v.accent }} />
        </div>
      </div>
    );
  }

  /* ─── TOC ─── */
  if (page.type === "toc") {
    return (
      <div className="w-full h-full flex flex-col px-[3em] py-[3em]" style={{ ...baseStyle, backgroundColor: v.bg }}>
        <div className="mb-[1.5em]">
          <span className="font-bold uppercase tracking-[0.3em] opacity-60" style={{ fontSize: "0.65em", color: v.accent }}>
            Índice
          </span>
          <div className="w-[4em] h-[2px] mt-[0.5em] opacity-30" style={{ backgroundColor: v.accent }} />
        </div>
        <div className="flex-1 space-y-0">
          {page.chapters.map((ch, i) => (
            <button
              key={i}
              className="flex items-baseline gap-[0.6em] py-[0.5em] border-b border-current/5 last:border-0 w-full text-left transition-opacity hover:opacity-70 group/toc-item"
              style={{ borderColor: `color-mix(in srgb, ${v.primary} 8%, transparent)`, cursor: onGoToPage ? "pointer" : "default" }}
              onClick={(e) => {
                e.stopPropagation();
                onGoToPage?.(ch.pageStart);
              }}
            >
              <span className="font-bold w-[1.5em] text-right tabular-nums shrink-0 opacity-40" style={{ fontSize: "0.8em", color: v.accent }}>
                {i + 1}
              </span>
              <span className="flex-1 group-hover/toc-item:underline" style={{ fontSize: "1em", fontFamily: v.bodyFont, color: v.primary }}>
                {ch.title}
              </span>
              <span className="flex-shrink-0 tabular-nums font-mono opacity-40" style={{ fontSize: "0.8em", color: v.accent }}>
                {ch.pageStart}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── CHAPTER TITLE ─── */
  if (page.type === "chapter-title") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden" style={{ ...baseStyle, backgroundColor: v.bg }}>
        {page.coverImage ? (
          <>
            <img src={page.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${v.bg}, ${v.bg}99, ${v.bg}66)` }} />
          </>
        ) : null}
        <div className="relative z-10 text-center px-[2em]">
          <span className="font-bold uppercase tracking-[0.35em] opacity-50" style={{ fontSize: "0.65em", color: v.accent }}>
            Capítulo {page.chapterIndex + 1}
          </span>
          <div className="w-[3em] h-[2px] mx-auto mt-[0.6em] mb-[1em] opacity-30" style={{ backgroundColor: v.accent }} />
          <h2 className="font-bold leading-tight" style={{ fontSize: "2em", fontFamily: v.headingFont, color: v.primary }}>
            {page.title}
          </h2>
        </div>
      </div>
    );
  }

  /* ─── CONTACT ─── */
  if (page.type === "contact") {
    const d = page.contactData;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden" style={{ ...baseStyle, background: v.primary }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
        <div className="relative z-10 text-center px-[2em] max-w-full">
          {d.logo_url && (
            <img src={d.logo_url} alt="" className="w-[5em] h-[5em] object-contain mx-auto mb-[1.2em] rounded-xl" />
          )}
          <div className="flex items-center justify-center gap-[0.5em] mb-[1em]">
            <span className="block w-[2em] h-[1px] opacity-40" style={{ backgroundColor: v.accent }} />
            <span className="opacity-50" style={{ fontSize: "0.8em", color: v.accent }}>✦</span>
            <span className="block w-[2em] h-[1px] opacity-40" style={{ backgroundColor: v.accent }} />
          </div>
          {d.slogan && (
            <p className="italic text-white/80 mb-[1.5em] leading-relaxed" style={{ fontSize: "1.4em", fontFamily: v.bodyFont }}>
              "{d.slogan}"
            </p>
          )}
          <p className="uppercase tracking-[0.25em] mb-[1.5em] opacity-60" style={{ fontSize: "0.6em", color: v.accent }}>
            {page.title}
          </p>
          <div className="space-y-[0.5em] mb-[1.5em]">
            {d.email && (
              <a href={`mailto:${d.email}`} className="flex items-center justify-center gap-[0.5em] text-white/70 hover:text-white transition-colors" style={{ pointerEvents: "auto", cursor: "pointer", textDecoration: "none" }}>
                <Mail className="shrink-0" style={{ width: "0.9em", height: "0.9em" }} />
                <span className="hover:underline" style={{ fontSize: "0.8em" }}>{d.email}</span>
              </a>
            )}
            {d.phone && (
              <a href={`tel:${d.phone}`} className="flex items-center justify-center gap-[0.5em] text-white/70 hover:text-white transition-colors" style={{ pointerEvents: "auto", cursor: "pointer", textDecoration: "none" }}>
                <Phone className="shrink-0" style={{ width: "0.9em", height: "0.9em" }} />
                <span className="hover:underline" style={{ fontSize: "0.8em" }}>{d.phone}</span>
              </a>
            )}
            {d.website && (
              <a href={d.website.startsWith("http") ? d.website : `https://${d.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-[0.5em] text-white/70 hover:text-white transition-colors" style={{ pointerEvents: "auto", cursor: "pointer", textDecoration: "none" }}>
                <Globe className="shrink-0" style={{ width: "0.9em", height: "0.9em" }} />
                <span className="hover:underline" style={{ fontSize: "0.8em" }}>{d.website}</span>
              </a>
            )}
          </div>
          {d.social_links && d.social_links.length > 0 && (
            <div className="flex items-center justify-center gap-[1em] flex-wrap">
              {d.social_links.map((link, i) => (
                <a key={i} href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[0.3em] hover:opacity-80 transition-opacity" style={{ color: v.accent, pointerEvents: "auto", cursor: "pointer", textDecoration: "none" }}>
                  <ExternalLink style={{ width: "0.7em", height: "0.7em" }} />
                  <span className="hover:underline" style={{ fontSize: "0.7em" }}>{link.label}</span>
                </a>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-[0.5em] mt-[2em]">
            <span className="block w-[1.5em] h-[1px] opacity-30" style={{ backgroundColor: v.accent }} />
            <span className="opacity-40" style={{ fontSize: "0.7em", color: v.accent }}>❧</span>
            <span className="block w-[1.5em] h-[1px] opacity-30" style={{ backgroundColor: v.accent }} />
          </div>
        </div>
      </div>
    );
  }

  /* ─── CONTENT PAGE ─── */
  const headerLabel = page.headerText || page.chapterTitle;
  const footerLabel = page.footerText;

  return (
    <div
      className="w-full h-full flex flex-col px-[2.5em] py-[2em] relative overflow-hidden"
      style={{ ...baseStyle, backgroundColor: v.bg }}
    >
      {/* Corner ornament top-right */}
      <div className="absolute top-0 right-0 w-[4em] h-[4em] pointer-events-none opacity-[0.06]">
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ color: v.accent }}>
          <path d="M100,0 C100,55 55,100 0,100 L0,85 C47,85 85,47 85,0 Z" fill="currentColor" />
          <path d="M100,0 C100,40 40,80 0,80 L0,70 C35,70 70,35 70,0 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
      {/* Corner ornament bottom-left */}
      <div className="absolute bottom-0 left-0 w-[4em] h-[4em] pointer-events-none opacity-[0.06] rotate-180">
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ color: v.accent }}>
          <path d="M100,0 C100,55 55,100 0,100 L0,85 C47,85 85,47 85,0 Z" fill="currentColor" />
          <path d="M100,0 C100,40 40,80 0,80 L0,70 C35,70 70,35 70,0 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-[0.8em] pb-[0.3em]">
        <span className="font-semibold uppercase tracking-[0.2em] truncate max-w-[70%] opacity-40" style={{ fontSize: "0.65em", color: v.accent }}>
          {headerLabel}
        </span>
        <span className="opacity-20" style={{ fontSize: "0.7em", color: v.accent }}>✦</span>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto prose max-w-none
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-current/10 [&::-webkit-scrollbar-track]:bg-transparent
          prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto prose-img:my-[0.6em] prose-img:max-h-[45%]
        "
        style={{
          fontSize: "1em",
          fontFamily: v.bodyFont,
          color: "#374151",
          lineHeight: 1.75,
        }}
      >
        {isHtmlContent(page.content) ? (
          <>
            <style>{htmlContentScopedCSS}</style>
            <div
              className="ebook-html-content"
              dangerouslySetInnerHTML={{ __html: applyHighlightsToHtml(page.content, highlights) }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const anchor = target.closest('a');
                if (anchor) {
                  e.preventDefault();
                  e.stopPropagation();
                  const href = anchor.getAttribute('href');
                  if (href) window.open(href, '_blank', 'noopener,noreferrer');
                }
              }}
            />
          </>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p style={{ fontSize: "1em", marginBottom: "0.7em", lineHeight: 1.75, color: "inherit" }}>{children}</p>
              ),
              h1: ({ children }) => (
                <h1 style={{ fontSize: "1.5em", fontFamily: v.headingFont, color: v.primary, fontWeight: 700, marginBottom: "0.5em", marginTop: "0.8em" }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ fontSize: "1.3em", fontFamily: v.headingFont, color: v.primary, fontWeight: 700, marginBottom: "0.5em", marginTop: "0.8em", paddingLeft: "0.5em", paddingTop: "0.25em", paddingBottom: "0.25em", borderRadius: "0.25em", background: `linear-gradient(to right, color-mix(in srgb, ${v.accent} 12%, transparent), transparent)` }}>
                  <span style={{ color: v.accent, opacity: 0.4, marginRight: "0.3em", fontSize: "0.8em" }}>❧</span>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ fontSize: "1.15em", fontFamily: v.headingFont, color: v.primary, fontWeight: 600, marginBottom: "0.4em", marginTop: "0.7em" }}>
                  <span style={{ display: "block", width: "2em", height: "2px", borderRadius: "9999px", marginBottom: "0.3em", opacity: 0.3, backgroundColor: v.accent }} />
                  {children}
                </h3>
              ),
              li: ({ children }) => (
                <li style={{ fontSize: "1em", marginBottom: "0.3em", color: "inherit" }}>{children}</li>
              ),
              strong: ({ children }) => (
                <strong style={{ color: v.primary, fontWeight: 700 }}>{children}</strong>
              ),
              blockquote: ({ children }) => (
                <div style={{ position: "relative", margin: "0.8em 0", padding: "0.8em 1.4em", borderRadius: "0.5em", background: `linear-gradient(to bottom right, color-mix(in srgb, ${v.accent} 10%, transparent), color-mix(in srgb, ${v.accent} 5%, transparent))` }}>
                  <span style={{ position: "absolute", top: "-0.1em", left: "0.3em", fontSize: "3em", opacity: 0.15, fontFamily: "serif", lineHeight: 1, color: v.accent }}>
                    "
                  </span>
                  <div style={{ position: "relative", fontStyle: "italic", fontFamily: v.bodyFont, fontSize: "0.9em", color: "#475569" }}>
                    {children}
                  </div>
                  <span style={{ position: "absolute", bottom: "-0.5em", right: "0.5em", fontSize: "3em", opacity: 0.15, fontFamily: "serif", lineHeight: 1, color: v.accent }}>
                    "
                  </span>
                </div>
              ),
              hr: () => (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5em", margin: "1.2em 0", color: v.accent, opacity: 0.25, fontSize: "0.9em" }}>
                  <span style={{ display: "block", width: "1.5em", height: "1px", backgroundColor: v.accent, opacity: 0.4 }} />
                  <span>✦</span>
                  <span style={{ display: "block", width: "1.5em", height: "1px", backgroundColor: v.accent, opacity: 0.4 }} />
                </div>
              ),
              code: ({ children }) => (
                <code style={{ fontSize: "0.85em", padding: "0.1em 0.3em", borderRadius: "0.2em", background: `color-mix(in srgb, ${v.accent} 8%, transparent)` }}>
                  {children}
                </code>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); }}
                  style={{ color: v.accent, textDecoration: "underline", cursor: "pointer", fontWeight: 500 }}
                >
                  {children}
                </a>
              ),
              img: ({ node, ...props }) => (
                <figure style={{ margin: "0.8em 0" }}>
                  <img {...props} className="rounded-lg shadow-md mx-auto max-w-full" style={{ maxHeight: "45%" }} />
                  {props.alt && (
                    <figcaption style={{ textAlign: "center", color: "#94a3b8", marginTop: "0.4em", fontStyle: "italic", fontSize: "0.75em" }}>
                      {props.alt}
                    </figcaption>
                  )}
                </figure>
              ),
            }}
          >
            {page.content}
          </ReactMarkdown>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center mt-[0.5em] pt-[0.3em] gap-[0.4em]">
        <span className="block w-[1em] h-[1px] opacity-20" style={{ backgroundColor: v.accent }} />
        <span className="tabular-nums opacity-30" style={{ fontSize: "0.7em", color: v.accent }}>
          {footerLabel ? `${footerLabel} · ${page.pageNumber}` : page.pageNumber}
        </span>
        <span className="block w-[1em] h-[1px] opacity-20" style={{ backgroundColor: v.accent }} />
      </div>
    </div>
  );
}

/* Scoped CSS for HTML content pages — mirrors the markdown components */
const htmlContentScopedCSS = `
  .ebook-html-content { line-height: 1.75; }
  .ebook-html-content h1 {
    font-size: 1.5em; font-family: var(--ebook-heading-font, Georgia, serif);
    color: var(--ebook-primary, #0f172a); font-weight: 700;
    margin: 0.8em 0 0.5em;
  }
  .ebook-html-content h2 {
    font-size: 1.3em; font-family: var(--ebook-heading-font, Georgia, serif);
    color: var(--ebook-primary, #0f172a); font-weight: 700;
    margin: 0.8em 0 0.5em; padding: 0.25em 0.5em; border-radius: 0.25em;
    background: linear-gradient(to right, color-mix(in srgb, var(--ebook-accent, #b4884e) 12%, transparent), transparent);
  }
  .ebook-html-content h3 {
    font-size: 1.15em; font-family: var(--ebook-heading-font, Georgia, serif);
    color: var(--ebook-primary, #0f172a); font-weight: 600;
    margin: 0.7em 0 0.4em;
    border-top: 2px solid color-mix(in srgb, var(--ebook-accent, #b4884e) 30%, transparent);
    padding-top: 0.3em;
  }
  .ebook-html-content p { font-size: 1em; margin-bottom: 0.7em; line-height: 1.75; }
  .ebook-html-content strong { color: var(--ebook-primary, #0f172a); font-weight: 700; }
  .ebook-html-content blockquote {
    position: relative; margin: 0.8em 0; padding: 0.8em 1.4em; border-radius: 0.5em;
    font-style: italic; font-size: 0.95em; color: #475569;
    background: linear-gradient(to bottom right, color-mix(in srgb, var(--ebook-accent, #b4884e) 10%, transparent), color-mix(in srgb, var(--ebook-accent, #b4884e) 5%, transparent));
    border-left: 3px solid var(--ebook-accent, #b4884e);
  }
  .ebook-html-content hr {
    border: none; height: 1px; margin: 1.2em 0;
    background: linear-gradient(to right, transparent, var(--ebook-accent, #b4884e), transparent);
    opacity: 0.25;
  }
  .ebook-html-content code {
    font-size: 0.85em; padding: 0.1em 0.3em; border-radius: 0.2em;
    background: color-mix(in srgb, var(--ebook-accent, #b4884e) 8%, transparent);
  }
  .ebook-html-content ul, .ebook-html-content ol { padding-left: 1.5em; margin-bottom: 0.7em; }
  .ebook-html-content li { margin-bottom: 0.3em; }
  .ebook-html-content img {
    max-width: 100%; border-radius: 0.5em; margin: 0.8em auto; display: block;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    max-height: 45%;
  }
  .ebook-html-content figure {
    margin: 0.8em 0; text-align: center;
  }
  .ebook-html-content figure img {
    margin: 0 auto 0.4em;
  }
  .ebook-html-content figcaption {
    font-size: 0.75em; font-style: italic; color: #94a3b8; text-align: center;
  }
  .ebook-html-content a {
    color: var(--ebook-accent, #b4884e); text-decoration: underline;
    cursor: pointer; font-weight: 500;
    transition: opacity 0.15s;
  }
  .ebook-html-content a:hover { opacity: 0.7; }
  .ebook-html-content .ebook-cta-link {
    display: inline-block; padding: 0.5em 1.2em; border-radius: 0.4em;
    background: var(--ebook-accent, #b4884e); color: #fff !important;
    text-decoration: none; font-weight: 600; font-size: 0.9em;
    text-align: center; margin: 0.8em 0;
    transition: opacity 0.15s;
  }
  .ebook-html-content .ebook-cta-link:hover { opacity: 0.85; }
`;
