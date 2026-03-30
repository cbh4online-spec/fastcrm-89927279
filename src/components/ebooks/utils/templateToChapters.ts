import type { EbookTemplate, LayoutKey } from "@/types/ebook-templates";
import { resolvePlaceholders, LAYOUT_LABELS } from "@/types/ebook-templates";
import type { EbookChapter } from "@/hooks/useEbooks";

/** Layout keys that correspond to AI-generated content chapters */
export const CONTENT_LAYOUT_KEYS: LayoutKey[] = [
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
    content: `<div class="ebook-cover-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
      text-align:center;padding:3rem 2.5rem;position:relative;overflow:hidden;
      background:linear-gradient(135deg, var(--ebook-primary,#0f172a) 0%, color-mix(in srgb, var(--ebook-primary,#0f172a) 80%, var(--ebook-accent,#b4884e)) 100%);
      color:#fff;font-family:var(--ebook-heading-font,Georgia,serif);
    ">
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 60%);pointer-events:none;"></div>
      <div style="position:absolute;top:2rem;left:50%;transform:translateX(-50%);width:5rem;height:2px;background:var(--ebook-accent,#b4884e);opacity:0.5;border-radius:9999px;"></div>
      <div style="position:relative;z-index:1;max-width:90%;">
        <div style="font-size:0.7rem;letter-spacing:0.35em;text-transform:uppercase;opacity:0.5;margin-bottom:1.5rem;color:var(--ebook-accent,#b4884e);">eBook</div>
        <h1 style="font-size:2.4rem;font-weight:800;line-height:1.15;margin:0 0 0.8rem;text-shadow:0 2px 20px rgba(0,0,0,0.3);">${v.book_title || "Título do eBook"}</h1>
        ${v.book_subtitle ? `<p style="font-size:1.1rem;opacity:0.75;margin:0 0 2rem;font-style:italic;font-family:var(--ebook-body-font,Georgia,serif);">${v.book_subtitle}</p>` : '<div style="margin-bottom:2rem;"></div>'}
        <div style="display:flex;align-items:center;justify-content:center;gap:0.8rem;margin-bottom:1.5rem;">
          <span style="display:block;width:2.5rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.4;"></span>
          <span style="color:var(--ebook-accent,#b4884e);opacity:0.6;font-size:0.8rem;">✦</span>
          <span style="display:block;width:2.5rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.4;"></span>
        </div>
        ${v.author_name ? `<p style="font-size:0.9rem;letter-spacing:0.15em;text-transform:uppercase;opacity:0.8;">por <strong>${v.author_name}</strong></p>` : ""}
        ${v.company_name ? `<p style="font-size:0.75rem;opacity:0.5;margin-top:0.5rem;">${v.company_name}</p>` : ""}
      </div>
      <div style="position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);width:5rem;height:2px;background:var(--ebook-accent,#b4884e);opacity:0.5;border-radius:9999px;"></div>
    </div>`,
  }),
  cover_split: (v) => ({
    title: "Capa",
    content: `<div class="ebook-cover-page" style="
      width:100%;height:100%;display:flex;position:relative;overflow:hidden;
      background:var(--ebook-primary,#0f172a);color:#fff;
    ">
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:3rem 2.5rem;position:relative;z-index:1;">
        <div style="font-size:0.65rem;letter-spacing:0.35em;text-transform:uppercase;color:var(--ebook-accent,#b4884e);opacity:0.7;margin-bottom:1.5rem;">eBook</div>
        <h1 style="font-size:2.2rem;font-weight:800;line-height:1.15;margin:0 0 0.8rem;font-family:var(--ebook-heading-font,Georgia,serif);">${v.book_title || "Título do eBook"}</h1>
        ${v.book_subtitle ? `<p style="font-size:1rem;opacity:0.7;font-style:italic;margin:0 0 1.5rem;font-family:var(--ebook-body-font,Georgia,serif);">${v.book_subtitle}</p>` : '<div style="margin-bottom:1.5rem;"></div>'}
        <div style="width:3rem;height:2px;background:var(--ebook-accent,#b4884e);opacity:0.5;margin-bottom:1.5rem;border-radius:9999px;"></div>
        ${v.author_name ? `<p style="font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8;">${v.author_name}</p>` : ""}
      </div>
      <div style="position:absolute;right:0;top:0;bottom:0;width:40%;background:linear-gradient(180deg, var(--ebook-accent,#b4884e) 0%, color-mix(in srgb, var(--ebook-accent,#b4884e) 70%, var(--ebook-primary,#0f172a)) 100%);opacity:0.15;"></div>
      <div style="position:absolute;right:2rem;top:50%;transform:translateY(-50%);width:3rem;height:3rem;border:2px solid var(--ebook-accent,#b4884e);opacity:0.2;border-radius:50%;"></div>
    </div>`,
  }),
  copyright_simple: (v) => ({
    title: "Copyright",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-end;
      padding:3rem 2.5rem;font-family:var(--ebook-body-font,Georgia,serif);
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
    ">
      <div style="opacity:0.5;font-size:0.8rem;line-height:1.8;">
        <div style="width:2.5rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.4;margin-bottom:1.5rem;"></div>
        <p style="margin:0 0 0.5rem;font-weight:600;">Aviso de Direitos</p>
        <p style="margin:0 0 0.8rem;">${v.copyright_text || `© ${new Date().getFullYear()} ${v.author_name || "Autor"}. Todos os direitos reservados.`}</p>
        <p style="margin:0;">Este material é propriedade intelectual do autor. Nenhuma parte desta publicação pode ser reproduzida sem autorização prévia por escrito.</p>
      </div>
    </div>`,
  }),
  disclaimer_clean: (v) => ({
    title: "Disclaimer",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;
      padding:3rem 2.5rem;font-family:var(--ebook-body-font,Georgia,serif);
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
    ">
      <div style="max-width:85%;">
        <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.5rem;">
          <div style="width:3px;height:2.5rem;background:var(--ebook-accent,#b4884e);border-radius:9999px;opacity:0.6;"></div>
          <h2 style="font-size:1.3rem;font-weight:700;margin:0;font-family:var(--ebook-heading-font,Georgia,serif);">Aviso Legal</h2>
        </div>
        <p style="font-size:0.9rem;line-height:1.8;opacity:0.7;">As informações contidas neste eBook são fornecidas apenas para fins educativos e informativos. O autor não se responsabiliza por quaisquer consequências decorrentes da aplicação dos conceitos aqui apresentados.</p>
      </div>
    </div>`,
  }),
  table_of_contents_split: () => ({
    title: "Índice",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;
      padding:3rem 2.5rem;font-family:var(--ebook-body-font,Georgia,serif);
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
    ">
      <div style="margin-bottom:1.5rem;">
        <span style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--ebook-accent,#b4884e);opacity:0.6;font-weight:700;">Índice</span>
        <div style="width:4rem;height:2px;margin-top:0.5rem;background:var(--ebook-accent,#b4884e);opacity:0.3;border-radius:9999px;"></div>
      </div>
      <p style="font-style:italic;opacity:0.5;font-size:0.85rem;">Gerado automaticamente a partir da estrutura do eBook.</p>
    </div>`,
  }),
  welcome_letter: (v) => ({
    title: "Carta de Boas-Vindas",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;
      padding:3rem 2.5rem;font-family:var(--ebook-body-font,Georgia,serif);
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
    ">
      <div style="position:relative;max-width:90%;">
        <span style="position:absolute;top:-1.5rem;left:-0.5rem;font-size:4rem;opacity:0.08;font-family:serif;line-height:1;color:var(--ebook-accent,#b4884e);">"</span>
        <h2 style="font-size:1.4rem;font-weight:700;margin:0 0 1.2rem;font-family:var(--ebook-heading-font,Georgia,serif);">Bem-vindo</h2>
        <p style="font-size:0.95rem;line-height:1.8;margin:0 0 1rem;opacity:0.8;">${v.welcome_text || "Obrigado por escolher este eBook. Preparei este conteúdo com o objectivo de partilhar conhecimento prático e accionável."}</p>
        <p style="font-size:0.95rem;line-height:1.8;margin:0 0 2rem;opacity:0.8;">Espero que esta leitura seja transformadora para si.</p>
        <div style="width:3rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.3;margin-bottom:1rem;"></div>
        ${v.author_name ? `<p style="font-weight:700;font-size:1rem;margin:0;">${v.author_name}</p>` : ""}
        ${v.author_role ? `<p style="font-size:0.8rem;opacity:0.5;margin:0.2rem 0 0;">${v.author_role}</p>` : ""}
      </div>
    </div>`,
  }),
  quote_fullpage: (v) => ({
    title: "Citação",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;align-items:center;justify-content:center;
      padding:3rem;text-align:center;position:relative;overflow:hidden;
      background:linear-gradient(135deg, var(--ebook-primary,#0f172a) 0%, color-mix(in srgb, var(--ebook-primary,#0f172a) 85%, var(--ebook-accent,#b4884e)) 100%);
      color:#fff;
    ">
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.05) 0%, transparent 50%);pointer-events:none;"></div>
      <div style="position:relative;z-index:1;max-width:80%;">
        <span style="display:block;font-size:5rem;opacity:0.15;font-family:serif;line-height:0.6;color:var(--ebook-accent,#b4884e);margin-bottom:0.5rem;">"</span>
        <blockquote style="font-size:1.4rem;font-style:italic;line-height:1.8;margin:0;font-family:var(--ebook-body-font,Georgia,serif);">
          ${v.quote_text || "A melhor maneira de prever o futuro é criá-lo."}
        </blockquote>
        ${v.quote_author ? `<div style="margin-top:1.5rem;display:flex;align-items:center;justify-content:center;gap:0.6rem;">
          <span style="width:2rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.4;"></span>
          <span style="font-size:0.85rem;opacity:0.7;letter-spacing:0.1em;">${v.quote_author}</span>
          <span style="width:2rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.4;"></span>
        </div>` : ""}
      </div>
    </div>`,
  }),
  stats_highlight: (v) => ({
    title: "Estatísticas",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:3rem 2rem;text-align:center;
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
      font-family:var(--ebook-body-font,Georgia,serif);
    ">
      <span style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--ebook-accent,#b4884e);opacity:0.6;font-weight:700;margin-bottom:0.5rem;">Em Destaque</span>
      <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 0.3rem;font-family:var(--ebook-heading-font,Georgia,serif);">Números que Importam</h2>
      <div style="width:3rem;height:2px;background:var(--ebook-accent,#b4884e);opacity:0.3;margin:0.8rem auto 2rem;border-radius:9999px;"></div>
      <div style="display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap;width:100%;">
        <div style="flex:1;min-width:120px;max-width:180px;padding:1.5rem 1rem;border-radius:0.75rem;background:linear-gradient(135deg, color-mix(in srgb, var(--ebook-accent,#b4884e) 8%, transparent), color-mix(in srgb, var(--ebook-accent,#b4884e) 3%, transparent));border:1px solid color-mix(in srgb, var(--ebook-accent,#b4884e) 15%, transparent);">
          <p style="font-size:2.2rem;font-weight:800;margin:0;color:var(--ebook-accent,#b4884e);">85%</p>
          <p style="font-size:0.75rem;opacity:0.6;margin:0.3rem 0 0;">dos profissionais</p>
        </div>
        <div style="flex:1;min-width:120px;max-width:180px;padding:1.5rem 1rem;border-radius:0.75rem;background:linear-gradient(135deg, color-mix(in srgb, var(--ebook-accent,#b4884e) 8%, transparent), color-mix(in srgb, var(--ebook-accent,#b4884e) 3%, transparent));border:1px solid color-mix(in srgb, var(--ebook-accent,#b4884e) 15%, transparent);">
          <p style="font-size:2.2rem;font-weight:800;margin:0;color:var(--ebook-accent,#b4884e);">3x</p>
          <p style="font-size:0.75rem;opacity:0.6;margin:0.3rem 0 0;">mais resultados</p>
        </div>
        <div style="flex:1;min-width:120px;max-width:180px;padding:1.5rem 1rem;border-radius:0.75rem;background:linear-gradient(135deg, color-mix(in srgb, var(--ebook-accent,#b4884e) 8%, transparent), color-mix(in srgb, var(--ebook-accent,#b4884e) 3%, transparent));border:1px solid color-mix(in srgb, var(--ebook-accent,#b4884e) 15%, transparent);">
          <p style="font-size:2.2rem;font-weight:800;margin:0;color:var(--ebook-accent,#b4884e);">+120%</p>
          <p style="font-size:0.75rem;opacity:0.6;margin:0.3rem 0 0;">de crescimento</p>
        </div>
      </div>
    </div>`,
  }),
  testimonial_block: () => ({
    title: "Testemunho",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;
      padding:3rem 2.5rem;font-family:var(--ebook-body-font,Georgia,serif);
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
    ">
      <span style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--ebook-accent,#b4884e);opacity:0.6;font-weight:700;margin-bottom:1.5rem;">Testemunho</span>
      <div style="padding:2rem;border-radius:0.75rem;border-left:4px solid var(--ebook-accent,#b4884e);background:linear-gradient(135deg, color-mix(in srgb, var(--ebook-accent,#b4884e) 6%, transparent), transparent);">
        <span style="font-size:3rem;opacity:0.12;font-family:serif;line-height:0.6;display:block;color:var(--ebook-accent,#b4884e);margin-bottom:0.5rem;">"</span>
        <blockquote style="font-size:1.1rem;font-style:italic;line-height:1.8;margin:0;">
          Este eBook mudou completamente a minha perspectiva. Recomendo a todos os profissionais da área.
        </blockquote>
        <div style="display:flex;align-items:center;gap:0.8rem;margin-top:1.5rem;">
          <div style="width:2.5rem;height:2.5rem;border-radius:50%;background:linear-gradient(135deg, var(--ebook-accent,#b4884e), color-mix(in srgb, var(--ebook-accent,#b4884e) 60%, var(--ebook-primary,#0f172a)));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.9rem;">L</div>
          <div>
            <p style="font-weight:700;font-size:0.9rem;margin:0;">Leitor Satisfeito</p>
            <p style="font-size:0.75rem;opacity:0.5;margin:0;">Profissional do Sector</p>
          </div>
        </div>
      </div>
    </div>`,
  }),
  timeline_block: () => ({
    title: "Timeline",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;
      padding:3rem 2.5rem;font-family:var(--ebook-body-font,Georgia,serif);
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
    ">
      <span style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--ebook-accent,#b4884e);opacity:0.6;font-weight:700;margin-bottom:0.5rem;">Evolução</span>
      <h2 style="font-size:1.4rem;font-weight:700;margin:0 0 0.3rem;font-family:var(--ebook-heading-font,Georgia,serif);">Roadmap</h2>
      <div style="width:3rem;height:2px;background:var(--ebook-accent,#b4884e);opacity:0.3;margin:0.5rem 0 2rem;border-radius:9999px;"></div>
      <div style="position:relative;padding-left:2rem;">
        <div style="position:absolute;left:0.55rem;top:0.5rem;bottom:0.5rem;width:2px;background:linear-gradient(to bottom, var(--ebook-accent,#b4884e), color-mix(in srgb, var(--ebook-accent,#b4884e) 20%, transparent));border-radius:9999px;"></div>
        <div style="position:relative;margin-bottom:2rem;">
          <div style="position:absolute;left:-1.65rem;top:0.15rem;width:0.8rem;height:0.8rem;border-radius:50%;background:var(--ebook-accent,#b4884e);border:2px solid var(--ebook-bg,#fefcf9);"></div>
          <span style="display:inline-block;padding:0.15rem 0.6rem;border-radius:9999px;background:color-mix(in srgb, var(--ebook-accent,#b4884e) 12%, transparent);color:var(--ebook-accent,#b4884e);font-size:0.7rem;font-weight:700;letter-spacing:0.05em;margin-bottom:0.3rem;">FASE 1</span>
          <p style="font-weight:700;font-size:1rem;margin:0.3rem 0 0.2rem;">Descoberta e Diagnóstico</p>
          <p style="font-size:0.85rem;opacity:0.6;margin:0;">Análise inicial e identificação de oportunidades</p>
        </div>
        <div style="position:relative;margin-bottom:2rem;">
          <div style="position:absolute;left:-1.65rem;top:0.15rem;width:0.8rem;height:0.8rem;border-radius:50%;background:var(--ebook-accent,#b4884e);border:2px solid var(--ebook-bg,#fefcf9);opacity:0.7;"></div>
          <span style="display:inline-block;padding:0.15rem 0.6rem;border-radius:9999px;background:color-mix(in srgb, var(--ebook-accent,#b4884e) 12%, transparent);color:var(--ebook-accent,#b4884e);font-size:0.7rem;font-weight:700;letter-spacing:0.05em;margin-bottom:0.3rem;">FASE 2</span>
          <p style="font-weight:700;font-size:1rem;margin:0.3rem 0 0.2rem;">Implementação e Testes</p>
          <p style="font-size:0.85rem;opacity:0.6;margin:0;">Execução da estratégia e validação de resultados</p>
        </div>
        <div style="position:relative;">
          <div style="position:absolute;left:-1.65rem;top:0.15rem;width:0.8rem;height:0.8rem;border-radius:50%;background:var(--ebook-accent,#b4884e);border:2px solid var(--ebook-bg,#fefcf9);opacity:0.4;"></div>
          <span style="display:inline-block;padding:0.15rem 0.6rem;border-radius:9999px;background:color-mix(in srgb, var(--ebook-accent,#b4884e) 12%, transparent);color:var(--ebook-accent,#b4884e);font-size:0.7rem;font-weight:700;letter-spacing:0.05em;margin-bottom:0.3rem;">FASE 3</span>
          <p style="font-weight:700;font-size:1rem;margin:0.3rem 0 0.2rem;">Escala e Optimização</p>
          <p style="font-size:0.85rem;opacity:0.6;margin:0;">Crescimento sustentado e melhoria contínua</p>
        </div>
      </div>
    </div>`,
  }),
  cta_page: (v) => ({
    title: "Call to Action",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:3rem 2.5rem;text-align:center;position:relative;overflow:hidden;
      background:linear-gradient(160deg, var(--ebook-primary,#0f172a) 0%, color-mix(in srgb, var(--ebook-primary,#0f172a) 75%, var(--ebook-accent,#b4884e)) 100%);
      color:#fff;font-family:var(--ebook-body-font,Georgia,serif);
    ">
      <div style="position:absolute;top:0;right:0;width:40%;height:40%;background:radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);pointer-events:none;"></div>
      <div style="position:relative;z-index:1;max-width:85%;">
        <span style="font-size:0.65rem;letter-spacing:0.35em;text-transform:uppercase;color:var(--ebook-accent,#b4884e);opacity:0.7;margin-bottom:1rem;display:block;">Próximo Passo</span>
        <h2 style="font-size:1.8rem;font-weight:800;margin:0 0 1rem;font-family:var(--ebook-heading-font,Georgia,serif);">Pronto para Transformar?</h2>
        <p style="font-size:1rem;opacity:0.75;margin:0 0 2rem;line-height:1.7;">${v.cta_text || "Entre em contacto e descubra como podemos ajudá-lo a alcançar resultados extraordinários."}</p>
        <div style="display:inline-block;padding:0.7rem 2rem;border-radius:0.5rem;background:var(--ebook-accent,#b4884e);color:#fff;font-weight:700;font-size:0.9rem;letter-spacing:0.05em;box-shadow:0 4px 15px rgba(0,0,0,0.2);">Contacte-nos</div>
        <div style="margin-top:2rem;display:flex;flex-direction:column;gap:0.5rem;align-items:center;opacity:0.7;font-size:0.85rem;">
          ${v.website ? `<span>🌐 ${v.website}</span>` : ""}
          ${v.email ? `<span>✉ ${v.email}</span>` : ""}
          ${v.phone ? `<span>📞 ${v.phone}</span>` : ""}
        </div>
      </div>
    </div>`,
  }),
  author_section: (v) => ({
    title: "Sobre o Autor",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;
      padding:3rem 2.5rem;font-family:var(--ebook-body-font,Georgia,serif);
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
    ">
      <span style="font-size:0.65rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--ebook-accent,#b4884e);opacity:0.6;font-weight:700;margin-bottom:1.5rem;">Sobre o Autor</span>
      <div style="display:flex;gap:2rem;align-items:flex-start;">
        <div style="width:5rem;height:5rem;border-radius:50%;background:linear-gradient(135deg, var(--ebook-accent,#b4884e), color-mix(in srgb, var(--ebook-accent,#b4884e) 50%, var(--ebook-primary,#0f172a)));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1.8rem;flex-shrink:0;">${(v.author_name || "A").charAt(0).toUpperCase()}</div>
        <div style="flex:1;">
          ${v.author_name ? `<h3 style="font-size:1.3rem;font-weight:700;margin:0 0 0.2rem;font-family:var(--ebook-heading-font,Georgia,serif);">${v.author_name}</h3>` : ""}
          ${v.author_role ? `<p style="font-size:0.85rem;opacity:0.5;margin:0 0 1rem;">${v.author_role}</p>` : '<div style="margin-bottom:1rem;"></div>'}
          <p style="font-size:0.9rem;line-height:1.8;opacity:0.8;margin:0;">${v.author_bio || "Profissional apaixonado por partilhar conhecimento e ajudar outros a alcançar os seus objectivos."}</p>
          ${v.website || v.email ? `<div style="display:flex;gap:1rem;margin-top:1.2rem;flex-wrap:wrap;">
            ${v.website ? `<span style="font-size:0.8rem;padding:0.3rem 0.8rem;border-radius:9999px;background:color-mix(in srgb, var(--ebook-accent,#b4884e) 10%, transparent);color:var(--ebook-accent,#b4884e);">🌐 ${v.website}</span>` : ""}
            ${v.email ? `<span style="font-size:0.8rem;padding:0.3rem 0.8rem;border-radius:9999px;background:color-mix(in srgb, var(--ebook-accent,#b4884e) 10%, transparent);color:var(--ebook-accent,#b4884e);">✉ ${v.email}</span>` : ""}
          </div>` : ""}
        </div>
      </div>
    </div>`,
  }),
  thank_you_page: (v) => ({
    title: "Agradecimento",
    content: `<div class="ebook-structural-page" style="
      width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:3rem 2.5rem;text-align:center;position:relative;overflow:hidden;
      background:var(--ebook-bg,#fefcf9);color:var(--ebook-primary,#0f172a);
      font-family:var(--ebook-body-font,Georgia,serif);
    ">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20rem;height:20rem;border-radius:50%;background:radial-gradient(circle, color-mix(in srgb, var(--ebook-accent,#b4884e) 5%, transparent) 0%, transparent 70%);pointer-events:none;"></div>
      <div style="position:relative;z-index:1;">
        <div style="display:flex;align-items:center;justify-content:center;gap:0.6rem;margin-bottom:1.5rem;">
          <span style="display:block;width:2rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.3;"></span>
          <span style="color:var(--ebook-accent,#b4884e);opacity:0.4;font-size:1.2rem;">❧</span>
          <span style="display:block;width:2rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.3;"></span>
        </div>
        <h2 style="font-size:2rem;font-weight:800;margin:0 0 1rem;font-family:var(--ebook-heading-font,Georgia,serif);">Obrigado!</h2>
        <p style="font-size:1rem;opacity:0.7;margin:0 0 2rem;line-height:1.7;max-width:25rem;">Obrigado por ler este eBook. Esperamos que tenha sido uma leitura valiosa e transformadora.</p>
        <div style="width:3rem;height:1px;background:var(--ebook-accent,#b4884e);opacity:0.3;margin:0 auto 1.5rem;"></div>
        ${v.author_name ? `<p style="font-weight:700;font-size:1rem;margin:0;">${v.author_name}</p>` : ""}
        ${v.website ? `<p style="font-size:0.8rem;opacity:0.5;margin:0.3rem 0 0;">${v.website}</p>` : ""}
      </div>
    </div>`,
  }),
};

/** Count how many content slots a template has */
export function countContentSlots(template: EbookTemplate): number {
  return (template.page_layouts || []).filter(k => CONTENT_LAYOUT_KEYS.includes(k)).length;
}

/** Get structural (non-content) layout keys from a template */
export function getStructuralLayouts(template: EbookTemplate): LayoutKey[] {
  return (template.page_layouts || []).filter(k => !CONTENT_LAYOUT_KEYS.includes(k));
}

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
