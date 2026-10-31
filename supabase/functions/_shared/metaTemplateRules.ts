// Regras da Meta para modelos de mensagem (partilhadas front + back, sem Deno).

export const META_CATEGORIES = ["UTILITY", "MARKETING", "AUTHENTICATION"] as const;
export type MetaCategory = typeof META_CATEGORIES[number];

export const META_LANGUAGES = [
  { value: "pt_PT", label: "Português (Portugal)" },
  { value: "pt_BR", label: "Português (Brasil)" },
  { value: "es_ES", label: "Espanhol" },
  { value: "en_US", label: "Inglês (EUA)" },
  { value: "en_GB", label: "Inglês (Reino Unido)" },
  { value: "fr_FR", label: "Francês" },
] as const;

export type HeaderType = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
export type MetaButton = { type: ButtonType; text: string; url?: string; phone?: string; urlExample?: string };

export const MEDIA_RULES: Record<"IMAGE" | "VIDEO" | "DOCUMENT", { mimes: string[]; maxBytes: number; label: string }> = {
  IMAGE: { mimes: ["image/jpeg", "image/png"], maxBytes: 5 * 1024 * 1024, label: "JPG ou PNG até 5 MB" },
  VIDEO: { mimes: ["video/mp4", "video/3gpp"], maxBytes: 16 * 1024 * 1024, label: "MP4 ou 3GP até 16 MB" },
  DOCUMENT: { mimes: ["application/pdf"], maxBytes: 100 * 1024 * 1024, label: "PDF até 100 MB" },
};

export type MetaTemplateDraft = {
  name: string;
  category: MetaCategory;
  language: string;
  header?: string;
  headerType?: HeaderType;
  headerHandle?: string;
  body: string;
  footer?: string;
  examples: string[];
  buttons?: MetaButton[];
  /** Autenticação */
  addSecurityRecommendation?: boolean;
  codeExpirationMinutes?: number;
  copyCodeText?: string;
};

export type FieldErrors = Partial<Record<"name" | "category" | "language" | "header" | "body" | "footer" | "examples" | "buttons", string[]>>;

export function countBodyVariables(body: string): number {
  const nums = Array.from(body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 0;
}

export function toMetaTemplateName(raw: string): string {
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 512);
}

/** Avisos (não bloqueiam) sobre conteúdo que a Meta costuma recusar ou reclassificar. */
export function contentWarnings(d: MetaTemplateDraft): string[] {
  const w: string[] = [];
  const b = d.body.toLowerCase();
  if (d.category === "UTILITY" && /(promo|desconto|oferta|grátis|gratis|campanha|black friday|%)/.test(b)) {
    w.push("Texto com linguagem promocional: a Meta pode reclassificar como Marketing.");
  }
  if (/(https?:\/\/)?(bit\.ly|tinyurl|goo\.gl)/.test(b)) w.push("Evite links encurtados — a Meta tende a rejeitar.");
  if (/[A-ZÀ-Ú]{12,}/.test(d.body)) w.push("Evite blocos longos em maiúsculas.");
  if (d.category === "MARKETING" && !(d.buttons ?? []).some((x) => x.type === "QUICK_REPLY" && /sair|stop|cancelar/i.test(x.text)) && !/sair|stop/i.test(d.footer ?? "")) {
    w.push("Recomenda-se um botão ou rodapé com «SAIR» para cancelar comunicações comerciais.");
  }
  return w;
}

export function validateMetaTemplateFields(d: MetaTemplateDraft): FieldErrors {
  const e: FieldErrors = {};
  const add = (k: keyof FieldErrors, m: string) => { (e[k] ??= []).push(m); };
  if (!/^[a-z0-9_]{1,512}$/.test(d.name)) add("name", "O nome só pode ter letras minúsculas, números e _.");
  if (!META_CATEGORIES.includes(d.category)) add("category", "Categoria inválida.");
  if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(d.language)) add("language", "Idioma inválido.");

  if (d.category === "AUTHENTICATION") {
    const exp = d.codeExpirationMinutes;
    if (exp !== undefined && (!Number.isInteger(exp) || exp < 1 || exp > 90)) add("body", "A validade do código tem de ser entre 1 e 90 minutos.");
    if (d.copyCodeText && d.copyCodeText.length > 25) add("buttons", "O texto do botão copiar tem no máximo 25 caracteres.");
    return e;
  }

  const ht = d.headerType ?? (d.header?.trim() ? "TEXT" : "NONE");
  if (ht === "TEXT") {
    if (!d.header?.trim()) add("header", "Escreva o texto do cabeçalho.");
    if (d.header && d.header.length > 60) add("header", "O cabeçalho tem mais de 60 caracteres.");
    if (d.header && /\{\{/.test(d.header)) add("header", "O cabeçalho não pode ter variáveis.");
  } else if (ht !== "NONE" && !d.headerHandle) add("header", "Carregue o ficheiro de exemplo do cabeçalho.");

  const body = d.body.trim();
  if (!body) add("body", "O corpo é obrigatório.");
  if (body.length > 1024) add("body", "O corpo tem mais de 1024 caracteres.");
  const n = countBodyVariables(body);
  const found = new Set(Array.from(body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => Number(m[1])));
  for (let i = 1; i <= n; i++) if (!found.has(i)) { add("body", `Falta a variável {{${i}}} (têm de ser seguidas).`); break; }
  if (/^\s*\{\{\s*\d+\s*\}\}|\{\{\s*\d+\s*\}\}\s*$/.test(body)) add("body", "O corpo não pode começar nem acabar numa variável.");
  if (/\{\{\s*\d+\s*\}\}\s*\{\{\s*\d+\s*\}\}/.test(body)) add("body", "Não coloque duas variáveis seguidas sem texto entre elas.");
  const words = body.replace(/\{\{\s*\d+\s*\}\}/g, " ").split(/\s+/).filter(Boolean).length;
  if (n > 0 && words < n * 3 + 3) add("body", "Escreva mais texto à volta das variáveis (a Meta recusa textos curtos).");
  if (d.examples.length < n || d.examples.slice(0, n).some((x) => !x?.trim())) add("examples", "Indique um exemplo para cada variável.");

  if (d.footer && d.footer.length > 60) add("footer", "O rodapé tem mais de 60 caracteres.");
  if (d.footer && /\{\{/.test(d.footer)) add("footer", "O rodapé não pode ter variáveis.");

  const btns = d.buttons ?? [];
  if (btns.length > 10) add("buttons", "No máximo 10 botões.");
  if (btns.filter((b) => b.type === "URL").length > 2) add("buttons", "No máximo 2 botões de website.");
  if (btns.filter((b) => b.type === "PHONE_NUMBER").length > 1) add("buttons", "No máximo 1 botão de telefone.");
  // Meta exige que as respostas rápidas fiquem agrupadas (não intercaladas com botões de ação)
  const kinds = btns.map((b) => (b.type === "QUICK_REPLY" ? "Q" : "A")).join("");
  if (/Q+A+Q+|A+Q+A+/.test(kinds)) add("buttons", "Agrupe as respostas rápidas antes ou depois dos botões de website/telefone.");
  btns.forEach((b, i) => {
    const p = `Botão ${i + 1}: `;
    if (!b.text?.trim()) add("buttons", `${p}falta o texto.`);
    if (b.text && b.text.length > 25) add("buttons", `${p}texto com mais de 25 caracteres.`);
    if (b.type === "URL") {
      if (!/^https:\/\/[^\s]+$/.test(b.url ?? "")) add("buttons", `${p}o link tem de começar por https://.`);
      if (/\{\{1\}\}/.test(b.url ?? "") && !b.urlExample?.trim()) add("buttons", `${p}indique um exemplo para a parte variável do link.`);
    }
    if (b.type === "PHONE_NUMBER" && !/^\+[1-9]\d{7,14}$/.test(b.phone ?? "")) add("buttons", `${p}telefone em formato internacional, ex.: +351912345678.`);
  });
  const texts = btns.map((b) => b.text.trim().toLowerCase()).filter(Boolean);
  if (new Set(texts).size !== texts.length) add("buttons", "Os botões não podem ter textos repetidos.");
  return e;
}

export function validateMetaTemplate(d: MetaTemplateDraft): string[] {
  return Object.values(validateMetaTemplateFields(d)).flat() as string[];
}

export function buildMetaComponents(d: MetaTemplateDraft): unknown[] {
  if (d.category === "AUTHENTICATION") {
    const comps: unknown[] = [{ type: "BODY", add_security_recommendation: !!d.addSecurityRecommendation }];
    if (d.codeExpirationMinutes) comps.push({ type: "FOOTER", code_expiration_minutes: d.codeExpirationMinutes });
    comps.push({ type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: d.copyCodeText?.trim() || "Copiar código" }] });
    return comps;
  }
  const comps: unknown[] = [];
  const ht = d.headerType ?? (d.header?.trim() ? "TEXT" : "NONE");
  if (ht === "TEXT" && d.header?.trim()) comps.push({ type: "HEADER", format: "TEXT", text: d.header.trim() });
  else if (ht !== "NONE" && ht !== "TEXT" && d.headerHandle) comps.push({ type: "HEADER", format: ht, example: { header_handle: [d.headerHandle] } });
  const n = countBodyVariables(d.body);
  comps.push(n > 0
    ? { type: "BODY", text: d.body.trim(), example: { body_text: [d.examples.slice(0, n).map((e) => e.trim())] } }
    : { type: "BODY", text: d.body.trim() });
  if (d.footer?.trim()) comps.push({ type: "FOOTER", text: d.footer.trim() });
  const btns = d.buttons ?? [];
  if (btns.length) {
    comps.push({
      type: "BUTTONS",
      buttons: btns.map((b) => b.type === "URL"
        ? { type: "URL", text: b.text.trim(), url: b.url, ...(b.urlExample && /\{\{1\}\}/.test(b.url ?? "") ? { example: [b.urlExample] } : {}) }
        : b.type === "PHONE_NUMBER" ? { type: "PHONE_NUMBER", text: b.text.trim(), phone_number: b.phone }
        : { type: "QUICK_REPLY", text: b.text.trim() }),
    });
  }
  return comps;
}

/** Pode ser enviado a um contacto? Só aprovados. Marketing exige consentimento ativo. */
export function canSendTemplate(opts: { status: string; category: string; optedOut: boolean; marketingConsent: boolean }): { ok: true } | { ok: false; code: string; message: string } {
  if (opts.status !== "APPROVED") return { ok: false, code: "NOT_APPROVED", message: "Só modelos aprovados pela Meta podem ser enviados." };
  if (opts.optedOut) return { ok: false, code: "OPTED_OUT", message: "Este contacto pediu para não receber mensagens WhatsApp." };
  if (opts.category === "MARKETING" && !opts.marketingConsent) return { ok: false, code: "NO_CONSENT", message: "Sem consentimento válido de marketing para este contacto." };
  return { ok: true };
}

/** Campos do CRM que podem alimentar variáveis. */
export const CRM_FIELDS = [
  { value: "contact.first_name", label: "Nome" },
  { value: "contact.last_name", label: "Apelido" },
  { value: "contact.full_name", label: "Nome completo" },
  { value: "company.name", label: "Empresa" },
  { value: "contact.phone", label: "Telefone" },
  { value: "contact.email", label: "Email" },
  { value: "owner.name", label: "Responsável comercial" },
  { value: "manual", label: "Preencher no envio" },
] as const;
