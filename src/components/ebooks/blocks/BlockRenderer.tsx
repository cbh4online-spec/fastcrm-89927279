import type { StyleTokens, LayoutKey } from "@/types/ebook-templates";
import { resolvePlaceholders } from "@/types/ebook-templates";

interface BlockProps {
  layoutKey: LayoutKey;
  content: Record<string, unknown>;
  styleTokens: StyleTokens;
  placeholderVars?: Record<string, string | undefined>;
  isEditing?: boolean;
  onContentChange?: (content: Record<string, unknown>) => void;
}

function resolve(text: unknown, vars?: Record<string, string | undefined>): string {
  const s = String(text || "");
  return vars ? resolvePlaceholders(s, vars) : s;
}

function getShadow(shadow: string) {
  switch (shadow) {
    case "soft": return "0 4px 20px rgba(0,0,0,0.08)";
    case "medium": return "0 8px 30px rgba(0,0,0,0.12)";
    case "hard": return "0 10px 40px rgba(0,0,0,0.2)";
    case "glow": return "0 0 30px rgba(255,255,255,0.1)";
    default: return "none";
  }
}

export function BlockRenderer({ layoutKey, content, styleTokens: t, placeholderVars: v, isEditing, onContentChange }: BlockProps) {
  const shadow = getShadow(t.shadow);
  const r = (key: string) => resolve(content[key], v);

  const baseStyle: React.CSSProperties = {
    fontFamily: `"${t.bodyFont}", sans-serif`,
    color: t.secondaryColor,
    backgroundColor: t.backgroundColor,
    borderRadius: t.borderRadius,
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: `"${t.headingFont}", serif`,
    fontWeight: t.titleWeight,
    color: t.primaryColor,
  };

  switch (layoutKey) {
    case "cover_hero_image":
      return (
        <div style={{ ...baseStyle, position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: 500, overflow: "hidden", padding: 40 }}>
          {content.heroImage && (
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${content.heroImage})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.4 }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${t.primaryColor}ee, transparent)` }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{ ...headingStyle, fontSize: 42, lineHeight: 1.1, color: t.backgroundColor, marginBottom: 12 }}>{r("bookTitle") || "Título do eBook"}</h1>
            <p style={{ fontSize: 18, color: t.accentColor, marginBottom: 8 }}>{r("subTitle")}</p>
            <p style={{ fontSize: 14, color: `${t.backgroundColor}cc` }}>{r("authorName")}</p>
          </div>
        </div>
      );

    case "cover_split":
      return (
        <div style={{ ...baseStyle, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 500 }}>
          <div style={{ padding: 40, display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: t.primaryColor }}>
            <h1 style={{ ...headingStyle, fontSize: 36, color: t.backgroundColor, marginBottom: 12 }}>{r("bookTitle") || "Título"}</h1>
            <p style={{ fontSize: 16, color: t.accentColor, marginBottom: 8 }}>{r("subTitle")}</p>
            <p style={{ fontSize: 13, color: `${t.backgroundColor}99` }}>{r("authorName")}</p>
          </div>
          <div style={{ backgroundImage: content.heroImage ? `url(${content.heroImage})` : undefined, backgroundColor: t.accentColor, backgroundSize: "cover", backgroundPosition: "center" }} />
        </div>
      );

    case "copyright_simple":
      return (
        <div style={{ ...baseStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, padding: 40 }}>
          <p style={{ fontSize: 12, color: t.secondaryColor, textAlign: "center", opacity: 0.7 }}>{r("copyrightText") || "© 2025 Todos os direitos reservados."}</p>
        </div>
      );

    case "disclaimer_clean":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 300, display: "flex", alignItems: "center" }}>
          <div>
            <h3 style={{ ...headingStyle, fontSize: 18, marginBottom: 12 }}>Aviso Legal</h3>
            <p style={{ fontSize: 13, lineHeight: 1.8, opacity: 0.7 }}>{r("disclaimerText") || "Este documento é apenas para fins informativos. O conteúdo não constitui aconselhamento profissional."}</p>
          </div>
        </div>
      );

    case "table_of_contents_split":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 400 }}>
          <h2 style={{ ...headingStyle, fontSize: 28, marginBottom: 24, borderBottom: `2px solid ${t.accentColor}`, paddingBottom: 12 }}>Índice</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(Array.isArray(content.chapters) ? content.chapters as Array<{ title: string; page?: number }> : []).map((ch, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px dotted ${t.secondaryColor}33`, paddingBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{ch.title}</span>
                <span style={{ fontSize: 12, color: t.accentColor }}>{ch.page || i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "welcome_letter":
      return (
        <div style={{ ...baseStyle, padding: 48, minHeight: 400, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ ...headingStyle, fontSize: 24, marginBottom: 20 }}>Bem-vindo</h2>
          <p style={{ fontSize: 15, lineHeight: 1.9, maxWidth: 540 }}>{r("welcomeText") || "Obrigado por escolher este guia."}</p>
          <p style={{ marginTop: 24, fontSize: 14, color: t.accentColor, fontFamily: `"${t.headingFont}", serif` }}>{r("authorName")}</p>
        </div>
      );

    case "chapter_intro_large":
      return (
        <div style={{ ...baseStyle, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: t.primaryColor, padding: 40 }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: t.accentColor, fontFamily: `"${t.headingFont}", serif`, opacity: 0.3 }}>{r("chapterNumber") || "01"}</span>
            <h2 style={{ ...headingStyle, fontSize: 32, color: t.backgroundColor, marginTop: -16 }}>{r("chapterTitle") || "Capítulo"}</h2>
            <p style={{ fontSize: 14, color: `${t.backgroundColor}99`, marginTop: 8, maxWidth: 400, margin: "8px auto 0" }}>{r("chapterDescription")}</p>
          </div>
        </div>
      );

    case "chapter_intro_minimal":
      return (
        <div style={{ ...baseStyle, padding: 48, minHeight: 300, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 3, color: t.accentColor, marginBottom: 12 }}>Capítulo {r("chapterNumber") || "01"}</span>
          <h2 style={{ ...headingStyle, fontSize: 28 }}>{r("chapterTitle") || "Título do Capítulo"}</h2>
        </div>
      );

    case "rich_text":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 300 }}>
          <div style={{ fontSize: 14, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: r("htmlContent") || r("textContent") || "<p>Conteúdo aqui...</p>" }} />
        </div>
      );

    case "text_image_split":
      return (
        <div style={{ ...baseStyle, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 350, gap: 0 }}>
          <div style={{ padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3 style={{ ...headingStyle, fontSize: 22, marginBottom: 12 }}>{r("heading") || "Título"}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.8 }}>{r("textContent") || "Texto descritivo..."}</p>
          </div>
          <div style={{ backgroundImage: content.imageUrl ? `url(${content.imageUrl})` : undefined, backgroundColor: `${t.accentColor}22`, backgroundSize: "cover", backgroundPosition: "center" }} />
        </div>
      );

    case "three_column_highlights":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 300 }}>
          <h3 style={{ ...headingStyle, fontSize: 22, marginBottom: 24, textAlign: "center" }}>{r("heading") || "Destaques"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ padding: 20, backgroundColor: `${t.accentColor}11`, borderRadius: t.borderRadius, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: t.accentColor, marginBottom: 8 }}>{r(`stat${i}`) || "—"}</div>
                <p style={{ fontSize: 13 }}>{r(`label${i}`) || `Destaque ${i + 1}`}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "quote_fullpage":
      return (
        <div style={{ ...baseStyle, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 60, backgroundColor: t.primaryColor }}>
          <div style={{ textAlign: "center", maxWidth: 500 }}>
            <span style={{ fontSize: 60, color: t.accentColor, fontFamily: "Georgia, serif", lineHeight: 1 }}>"</span>
            <p style={{ fontSize: 20, fontStyle: "italic", lineHeight: 1.6, color: t.backgroundColor, fontFamily: `"${t.headingFont}", serif`, marginTop: -16 }}>{r("quoteText") || "Uma citação inspiradora."}</p>
            <p style={{ fontSize: 13, color: t.accentColor, marginTop: 16 }}>— {r("quoteAuthor") || "Autor"}</p>
          </div>
        </div>
      );

    case "stats_highlight":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 300 }}>
          <h3 style={{ ...headingStyle, fontSize: 22, marginBottom: 24, textAlign: "center" }}>{r("heading") || "Números"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: t.accentColor, fontFamily: `"${t.headingFont}", serif` }}>{r(`stat${i}`) || "0"}</div>
                <p style={{ fontSize: 13, marginTop: 4 }}>{r(`label${i}`) || `Métrica ${i + 1}`}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "testimonial_block":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 300, display: "flex", alignItems: "center" }}>
          <div style={{ padding: 24, borderLeft: `4px solid ${t.accentColor}`, backgroundColor: `${t.accentColor}08`, borderRadius: t.borderRadius, boxShadow: shadow }}>
            <p style={{ fontSize: 16, fontStyle: "italic", lineHeight: 1.7, marginBottom: 12 }}>{r("testimonialText") || "Um testemunho poderoso."}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: t.accentColor }}>{r("testimonialAuthor") || "Cliente"}</p>
            <p style={{ fontSize: 12, opacity: 0.6 }}>{r("testimonialRole")}</p>
          </div>
        </div>
      );

    case "timeline_block":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 300 }}>
          <h3 style={{ ...headingStyle, fontSize: 22, marginBottom: 24 }}>{r("heading") || "Timeline"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, borderLeft: `2px solid ${t.accentColor}`, paddingLeft: 24 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: -31, top: 4, width: 12, height: 12, borderRadius: "50%", backgroundColor: t.accentColor }} />
                <p style={{ fontSize: 12, color: t.accentColor, fontWeight: 600, marginBottom: 2 }}>{r(`date${i}`) || `Etapa ${i + 1}`}</p>
                <p style={{ fontSize: 14 }}>{r(`event${i}`) || "Descrição do evento"}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "cta_page":
      return (
        <div style={{ ...baseStyle, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: `linear-gradient(135deg, ${t.primaryColor}, ${t.accentColor}44)` }}>
          <div style={{ textAlign: "center", maxWidth: 450 }}>
            <h2 style={{ ...headingStyle, fontSize: 28, color: t.backgroundColor, marginBottom: 12 }}>{r("ctaHeading") || "Pronto para começar?"}</h2>
            <p style={{ fontSize: 15, color: `${t.backgroundColor}cc`, marginBottom: 24 }}>{r("ctaDescription") || "Dê o próximo passo."}</p>
            <div style={{ display: "inline-block", padding: "12px 32px", backgroundColor: t.accentColor, color: t.primaryColor, fontWeight: 600, borderRadius: t.borderRadius, fontSize: 14 }}>
              {r("ctaText") || "Contacte-nos"}
            </div>
          </div>
        </div>
      );

    case "author_section":
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 300, display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", backgroundColor: `${t.accentColor}33`, backgroundImage: content.authorImage ? `url(${content.authorImage})` : undefined, backgroundSize: "cover", flexShrink: 0 }} />
          <div>
            <h3 style={{ ...headingStyle, fontSize: 20, marginBottom: 8 }}>{r("authorName") || "Sobre o Autor"}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>{r("authorBio") || "Biografia do autor."}</p>
          </div>
        </div>
      );

    case "thank_you_page":
      return (
        <div style={{ ...baseStyle, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: t.primaryColor }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ ...headingStyle, fontSize: 32, color: t.backgroundColor, marginBottom: 12 }}>Obrigado!</h2>
            <p style={{ fontSize: 15, color: `${t.backgroundColor}bb` }}>{r("thankYouText") || "Obrigado por ler este eBook."}</p>
            {content.website && <p style={{ fontSize: 13, color: t.accentColor, marginTop: 16 }}>{r("website")}</p>}
          </div>
        </div>
      );

    default:
      return (
        <div style={{ ...baseStyle, padding: 40, minHeight: 200 }}>
          <p style={{ fontSize: 13, opacity: 0.5 }}>Bloco: {layoutKey}</p>
        </div>
      );
  }
}
