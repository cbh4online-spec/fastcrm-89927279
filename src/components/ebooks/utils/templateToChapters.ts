import type { EbookTemplate, LayoutKey } from "@/types/ebook-templates";
import { resolvePlaceholders, LAYOUT_LABELS } from "@/types/ebook-templates";
import type { EbookChapter } from "@/hooks/useEbooks";

/** Layout keys that correspond to AI-generated content chapters */
const CONTENT_LAYOUT_KEYS: LayoutKey[] = [
  "chapter_intro_large",
  "chapter_intro_minimal",
  "rich_text",
  "text_image_split",
  "three_column_highlights",
];

/** Layout keys that are structural (non-content) pages */
const STRUCTURAL_CONTENT: Record<string, (vars: Record<string, string>) => { title: string; content: string }> = {
  cover_hero_image: (v) => ({
    title: "Capa",
    content: `<div class="ebook-cover-page" style="text-align:center;padding:3rem 2rem;">
      <h1 style="font-size:2.5rem;font-weight:800;margin-bottom:0.5rem;">${v.book_title || "Título do eBook"}</h1>
      ${v.book_subtitle ? `<p style="font-size:1.2rem;opacity:0.8;margin-bottom:2rem;">${v.book_subtitle}</p>` : ""}
      ${v.author_name ? `<p style="font-size:1rem;margin-top:2rem;">por <strong>${v.author_name}</strong></p>` : ""}
    </div>`,
  }),
  cover_split: (v) => ({
    title: "Capa",
    content: `<div class="ebook-cover-page" style="display:flex;align-items:center;padding:2rem;">
      <div style="flex:1;">
        <h1 style="font-size:2.2rem;font-weight:800;">${v.book_title || "Título do eBook"}</h1>
        ${v.book_subtitle ? `<p style="font-size:1.1rem;opacity:0.8;margin-top:0.5rem;">${v.book_subtitle}</p>` : ""}
        ${v.author_name ? `<p style="margin-top:1.5rem;">por <strong>${v.author_name}</strong></p>` : ""}
      </div>
    </div>`,
  }),
  copyright_simple: (v) => ({
    title: "Copyright",
    content: `<div style="padding:3rem 2rem;font-size:0.85rem;opacity:0.7;">
      <p>${v.copyright_text || `© ${new Date().getFullYear()} ${v.author_name || "Autor"}. Todos os direitos reservados.`}</p>
      <p style="margin-top:1rem;">Este material é propriedade intelectual do autor. Nenhuma parte desta publicação pode ser reproduzida sem autorização prévia.</p>
    </div>`,
  }),
  disclaimer_clean: (v) => ({
    title: "Disclaimer",
    content: `<div style="padding:3rem 2rem;font-size:0.85rem;">
      <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:1rem;">Aviso Legal</h2>
      <p>As informações contidas neste eBook são fornecidas apenas para fins educativos e informativos. O autor não se responsabiliza por quaisquer consequências decorrentes da aplicação dos conceitos aqui apresentados.</p>
    </div>`,
  }),
  table_of_contents_split: () => ({
    title: "Índice",
    content: `<div style="padding:2rem;"><h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1.5rem;">Índice</h2><p style="opacity:0.6;font-style:italic;">Gerado automaticamente</p></div>`,
  }),
  welcome_letter: (v) => ({
    title: "Carta de Boas-Vindas",
    content: `<div style="padding:2rem;">
      <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem;">Bem-vindo</h2>
      <p>${v.welcome_text || `Obrigado por escolher este eBook. Preparei este conteúdo com o objectivo de partilhar conhecimento prático e accionável sobre o tema.`}</p>
      <p style="margin-top:1rem;">Espero que esta leitura seja transformadora para si.</p>
      ${v.author_name ? `<p style="margin-top:2rem;font-weight:600;">${v.author_name}</p>` : ""}
    </div>`,
  }),
  quote_fullpage: (v) => ({
    title: "Citação",
    content: `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;text-align:center;">
      <blockquote style="font-size:1.4rem;font-style:italic;max-width:80%;line-height:1.8;">
        "${v.quote_text || "A melhor maneira de prever o futuro é criá-lo."}"
        ${v.quote_author ? `<footer style="margin-top:1rem;font-size:0.9rem;opacity:0.7;">— ${v.quote_author}</footer>` : ""}
      </blockquote>
    </div>`,
  }),
  stats_highlight: (v) => ({
    title: "Estatísticas",
    content: `<div style="padding:2rem;text-align:center;">
      <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:2rem;">Números que Importam</h2>
      <div style="display:flex;gap:2rem;justify-content:center;flex-wrap:wrap;">
        <div><p style="font-size:2rem;font-weight:800;">85%</p><p style="font-size:0.85rem;opacity:0.7;">dos profissionais</p></div>
        <div><p style="font-size:2rem;font-weight:800;">3x</p><p style="font-size:0.85rem;opacity:0.7;">mais resultados</p></div>
        <div><p style="font-size:2rem;font-weight:800;">+120%</p><p style="font-size:0.85rem;opacity:0.7;">de crescimento</p></div>
      </div>
    </div>`,
  }),
  testimonial_block: () => ({
    title: "Testemunho",
    content: `<div style="padding:2rem;">
      <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:1.5rem;">O que dizem os leitores</h2>
      <blockquote style="border-left:3px solid currentColor;padding-left:1rem;margin:1rem 0;font-style:italic;">
        "Este eBook mudou completamente a minha perspectiva. Recomendo a todos os profissionais da área."
        <footer style="margin-top:0.5rem;font-size:0.85rem;opacity:0.7;">— Leitor satisfeito</footer>
      </blockquote>
    </div>`,
  }),
  timeline_block: () => ({
    title: "Timeline",
    content: `<div style="padding:2rem;">
      <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:1.5rem;">Evolução</h2>
      <div style="border-left:2px solid currentColor;padding-left:1.5rem;margin-left:0.5rem;">
        <div style="margin-bottom:1.5rem;"><p style="font-weight:700;">Fase 1</p><p style="font-size:0.9rem;opacity:0.8;">Descoberta e diagnóstico</p></div>
        <div style="margin-bottom:1.5rem;"><p style="font-weight:700;">Fase 2</p><p style="font-size:0.9rem;opacity:0.8;">Implementação e testes</p></div>
        <div><p style="font-weight:700;">Fase 3</p><p style="font-size:0.9rem;opacity:0.8;">Escala e optimização</p></div>
      </div>
    </div>`,
  }),
  cta_page: (v) => ({
    title: "Call to Action",
    content: `<div style="text-align:center;padding:3rem 2rem;">
      <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:1rem;">Pronto para o Próximo Passo?</h2>
      <p style="font-size:1.1rem;opacity:0.8;margin-bottom:2rem;">${v.cta_text || "Entre em contacto e descubra como podemos ajudá-lo."}</p>
      ${v.website ? `<p style="font-weight:600;">${v.website}</p>` : ""}
      ${v.email ? `<p style="opacity:0.8;">${v.email}</p>` : ""}
    </div>`,
  }),
  author_section: (v) => ({
    title: "Sobre o Autor",
    content: `<div style="padding:2rem;">
      <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem;">Sobre o Autor</h2>
      ${v.author_name ? `<p style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem;">${v.author_name}</p>` : ""}
      ${v.author_role ? `<p style="opacity:0.7;margin-bottom:1rem;">${v.author_role}</p>` : ""}
      <p>${v.author_bio || "Profissional apaixonado por partilhar conhecimento e ajudar outros a alcançar os seus objectivos."}</p>
    </div>`,
  }),
  thank_you_page: (v) => ({
    title: "Agradecimento",
    content: `<div style="text-align:center;padding:3rem 2rem;">
      <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:1rem;">Obrigado!</h2>
      <p style="font-size:1.1rem;opacity:0.8;">Obrigado por ler este eBook. Esperamos que tenha sido uma leitura valiosa.</p>
      ${v.author_name ? `<p style="margin-top:2rem;font-weight:600;">${v.author_name}</p>` : ""}
      ${v.website ? `<p style="opacity:0.7;">${v.website}</p>` : ""}
    </div>`,
  }),
};

export interface TemplateChapterData {
  title: string;
  subtitle?: string;
  authorName?: string;
  authorRole?: string;
  authorBio?: string;
  email?: string;
  website?: string;
  phone?: string;
  companyName?: string;
  ctaText?: string;
}

/**
 * Builds the full chapter list from a template's page_layouts,
 * merging AI-generated content chapters into the appropriate slots.
 */
export function buildChaptersFromTemplate(
  template: EbookTemplate,
  aiChapters: EbookChapter[],
  data: TemplateChapterData
): EbookChapter[] {
  const vars: Record<string, string> = {
    book_title: data.title || "",
    book_subtitle: data.subtitle || "",
    author_name: data.authorName || "",
    author_role: data.authorRole || "",
    author_bio: data.authorBio || "",
    email: data.email || "",
    website: data.website || "",
    phone: data.phone || "",
    company_name: data.companyName || "",
    cta_text: data.ctaText || "",
  };

  // Merge template default_content into vars (template provides fallbacks)
  if (template.default_content) {
    for (const [key, val] of Object.entries(template.default_content)) {
      if (val && !vars[key]) {
        vars[key] = resolvePlaceholders(val, vars);
      }
    }
  }

  const chapters: EbookChapter[] = [];
  let aiIndex = 0;

  for (const layoutKey of template.page_layouts) {
    // Content slot — use next AI chapter
    if (CONTENT_LAYOUT_KEYS.includes(layoutKey)) {
      if (aiIndex < aiChapters.length) {
        chapters.push({
          ...aiChapters[aiIndex],
          layout_key: layoutKey,
        });
        aiIndex++;
      }
      continue;
    }

    // Structural page — generate from template
    const generator = STRUCTURAL_CONTENT[layoutKey];
    if (generator) {
      const { title, content } = generator(vars);
      chapters.push({
        id: `tpl-${layoutKey}-${chapters.length}`,
        title,
        content,
        layout_key: layoutKey,
      });
    }
  }

  // Append remaining AI chapters that didn't fit into template slots
  for (let i = aiIndex; i < aiChapters.length; i++) {
    chapters.push(aiChapters[i]);
  }

  return chapters;
}
