import type { BuilderAssetType } from "../types";

export interface BuilderTemplate {
  id: string;
  name: string;
  description: string;
  type: BuilderAssetType;
  style: "tailwind" | "css-inline";
  preview?: string;
  html: string;
}

const TAILWIND_HEAD = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{TITLE}}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>html,body{font-family:'Inter',ui-sans-serif,system-ui,sans-serif}</style>
</head>`;

// Helper to build tailwind doc
const tw = (title: string, body: string) =>
  `${TAILWIND_HEAD.replace("{{TITLE}}", title)}
<body class="bg-white text-slate-900 antialiased">
${body}
</body>
</html>`;

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
  // ========== SITE ==========
  {
    id: "site-clean",
    name: "Site Clean",
    description: "Site multi-secção minimalista com hero, features e footer.",
    type: "site",
    style: "tailwind",
    html: tw(
      "Site",
      `<header class="border-b">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="#" class="font-semibold text-lg">Marca</a>
    <nav class="flex gap-6 text-sm text-slate-600">
      <a href="#features" class="hover:text-slate-900">Funcionalidades</a>
      <a href="#about" class="hover:text-slate-900">Sobre</a>
      <a href="#contact" class="hover:text-slate-900">Contacto</a>
    </nav>
    <a href="#contact" class="text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white">Começar</a>
  </div>
</header>

<section class="max-w-6xl mx-auto px-6 py-24 text-center">
  <h1 class="text-5xl font-bold tracking-tight">Constrói algo notável</h1>
  <p class="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Uma proposta clara que comunica o valor em poucos segundos. Edita este texto para corresponder ao teu negócio.</p>
  <div class="mt-8 flex gap-3 justify-center">
    <a href="#" class="px-6 py-3 rounded-lg bg-slate-900 text-white font-medium">Saber mais</a>
    <a href="#" class="px-6 py-3 rounded-lg border border-slate-300 font-medium">Demonstração</a>
  </div>
</section>

<section id="features" class="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8">
  <div><div class="h-10 w-10 rounded-lg bg-slate-900 mb-4"></div><h3 class="font-semibold">Rápido</h3><p class="text-sm text-slate-600 mt-1">Performance optimizada por defeito.</p></div>
  <div><div class="h-10 w-10 rounded-lg bg-slate-900 mb-4"></div><h3 class="font-semibold">Simples</h3><p class="text-sm text-slate-600 mt-1">Setup em minutos, sem complicações.</p></div>
  <div><div class="h-10 w-10 rounded-lg bg-slate-900 mb-4"></div><h3 class="font-semibold">Escalável</h3><p class="text-sm text-slate-600 mt-1">Cresce contigo, sem limites.</p></div>
</section>

<footer class="border-t py-10 text-center text-sm text-slate-500">© 2025 Marca. Todos os direitos reservados.</footer>`,
    ),
  },
  {
    id: "site-bold",
    name: "Site Bold",
    description: "Site com hero a preto, alta densidade visual.",
    type: "site",
    style: "tailwind",
    html: tw(
      "Site Bold",
      `<header class="bg-slate-950 text-white">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="#" class="font-bold text-lg">◼ Marca</a>
    <nav class="flex gap-6 text-sm text-slate-300">
      <a href="#" class="hover:text-white">Produto</a>
      <a href="#" class="hover:text-white">Preços</a>
      <a href="#" class="hover:text-white">Contacto</a>
    </nav>
  </div>
  <div class="max-w-6xl mx-auto px-6 py-28">
    <h1 class="text-6xl font-bold leading-tight max-w-3xl">Faz o que parecia impossível.</h1>
    <p class="mt-6 text-xl text-slate-400 max-w-2xl">Plataforma all-in-one para equipas que entregam.</p>
    <a href="#" class="inline-block mt-8 px-8 py-4 bg-white text-slate-950 font-semibold rounded-lg">Começar grátis →</a>
  </div>
</header>
<section class="max-w-6xl mx-auto px-6 py-20"><h2 class="text-3xl font-bold mb-8">Confiam em nós</h2><div class="grid grid-cols-2 md:grid-cols-5 gap-8 opacity-60"><div class="h-10 bg-slate-300 rounded"></div><div class="h-10 bg-slate-300 rounded"></div><div class="h-10 bg-slate-300 rounded"></div><div class="h-10 bg-slate-300 rounded"></div><div class="h-10 bg-slate-300 rounded"></div></div></section>`,
    ),
  },

  // ========== LANDING ==========
  {
    id: "landing-saas",
    name: "Landing SaaS",
    description: "Landing de conversão com hero, prova social, features e CTA.",
    type: "landing",
    style: "tailwind",
    html: tw(
      "Landing",
      `<section class="bg-gradient-to-b from-slate-50 to-white">
  <div class="max-w-5xl mx-auto px-6 py-24 text-center">
    <span class="inline-block px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded-full">Novo · v2.0</span>
    <h1 class="mt-6 text-5xl md:text-6xl font-bold tracking-tight">Converte mais com menos esforço</h1>
    <p class="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">Ferramenta tudo-em-um para equipas comerciais que querem fechar negócios mais rápido.</p>
    <form class="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input type="email" placeholder="o-teu@email.com" class="flex-1 px-4 py-3 rounded-lg border border-slate-300" required />
      <button class="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg">Começar grátis</button>
    </form>
    <p class="mt-3 text-xs text-slate-500">14 dias grátis · sem cartão</p>
  </div>
</section>
<section class="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8 text-center">
  <div><div class="text-4xl font-bold">+38%</div><p class="text-sm text-slate-600 mt-1">Conversão média</p></div>
  <div><div class="text-4xl font-bold">2.4x</div><p class="text-sm text-slate-600 mt-1">Velocidade do funil</p></div>
  <div><div class="text-4xl font-bold">98%</div><p class="text-sm text-slate-600 mt-1">Clientes satisfeitos</p></div>
</section>
<section class="bg-slate-950 text-white py-20"><div class="max-w-3xl mx-auto px-6 text-center"><h2 class="text-3xl font-bold">Pronto para começar?</h2><p class="mt-3 text-slate-400">Junta-te a milhares de equipas que já confiam em nós.</p><a href="#" class="inline-block mt-6 px-8 py-3 bg-white text-slate-950 font-semibold rounded-lg">Experimenta grátis</a></div></section>`,
    ),
  },
  {
    id: "landing-product",
    name: "Landing Produto",
    description: "Landing com mockup grande à esquerda, copy à direita.",
    type: "landing",
    style: "tailwind",
    html: tw(
      "Produto",
      `<section class="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
  <div>
    <h1 class="text-4xl md:text-5xl font-bold leading-tight">O produto que tu mereces.</h1>
    <p class="mt-4 text-lg text-slate-600">Substitui esta descrição pela tua proposta de valor. Mantém-na curta e focada.</p>
    <ul class="mt-6 space-y-2 text-slate-700">
      <li>✓ Setup em 2 minutos</li>
      <li>✓ Integração com 200+ ferramentas</li>
      <li>✓ Suporte humano 24/7</li>
    </ul>
    <div class="mt-8 flex gap-3"><a class="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium" href="#">Comprar</a><a class="px-6 py-3 border rounded-lg font-medium" href="#">Ver demo</a></div>
  </div>
  <div class="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl border shadow-xl"></div>
</section>`,
    ),
  },

  // ========== FUNNEL ==========
  {
    id: "funnel-quiz",
    name: "Funil Quiz",
    description: "Funil multi-passo com quiz inicial e CTA final.",
    type: "funnel",
    style: "tailwind",
    html: tw(
      "Funil",
      `<section class="min-h-screen flex items-center justify-center bg-slate-50 p-6">
  <div class="max-w-xl w-full bg-white rounded-2xl border shadow-sm p-10">
    <div class="flex justify-between text-xs text-slate-500 mb-2"><span>Passo 1 de 3</span><span>33%</span></div>
    <div class="h-1.5 bg-slate-100 rounded-full mb-8"><div class="h-full w-1/3 bg-slate-900 rounded-full"></div></div>
    <h1 class="text-2xl font-bold">Qual é o teu maior desafio?</h1>
    <p class="text-slate-600 mt-2">Vamos personalizar a recomendação certa para ti.</p>
    <div class="mt-6 space-y-3">
      <button class="w-full text-left p-4 border rounded-lg hover:border-slate-900">📈 Crescer mais rápido</button>
      <button class="w-full text-left p-4 border rounded-lg hover:border-slate-900">⏱ Poupar tempo</button>
      <button class="w-full text-left p-4 border rounded-lg hover:border-slate-900">💰 Reduzir custos</button>
      <button class="w-full text-left p-4 border rounded-lg hover:border-slate-900">🤝 Melhorar a equipa</button>
    </div>
  </div>
</section>`,
    ),
  },
  {
    id: "funnel-vsl",
    name: "Funil VSL",
    description: "Vídeo de vendas com CTA por baixo.",
    type: "funnel",
    style: "tailwind",
    html: tw(
      "VSL",
      `<section class="bg-slate-950 text-white min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-16 text-center">
    <h1 class="text-3xl md:text-4xl font-bold">Descobre como triplicámos as nossas vendas em 90 dias</h1>
    <p class="mt-3 text-slate-400">Vê o vídeo completo (5 min)</p>
    <div class="mt-8 aspect-video bg-slate-800 rounded-xl flex items-center justify-center">
      <div class="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">▶</div>
    </div>
    <a href="#" class="inline-block mt-8 px-10 py-4 bg-amber-400 text-slate-950 font-bold rounded-lg text-lg">Quero saber como →</a>
  </div>
</section>`,
    ),
  },

  // ========== FORM ==========
  {
    id: "form-contact",
    name: "Formulário de Contacto",
    description: "Form simples com nome, email e mensagem.",
    type: "form",
    style: "tailwind",
    html: tw(
      "Contacto",
      `<section class="max-w-md mx-auto p-6 py-16">
  <h1 class="text-2xl font-bold">Fala connosco</h1>
  <p class="text-slate-600 mt-1">Respondemos em menos de 24h.</p>
  <form class="mt-6 space-y-4">
    <div><label class="block text-sm font-medium mb-1">Nome</label><input type="text" required class="w-full px-3 py-2 border rounded-lg" /></div>
    <div><label class="block text-sm font-medium mb-1">Email</label><input type="email" required class="w-full px-3 py-2 border rounded-lg" /></div>
    <div><label class="block text-sm font-medium mb-1">Mensagem</label><textarea rows="5" required class="w-full px-3 py-2 border rounded-lg"></textarea></div>
    <button class="w-full py-3 bg-slate-900 text-white font-medium rounded-lg">Enviar</button>
  </form>
</section>`,
    ),
  },
  {
    id: "form-lead",
    name: "Formulário Lead Magnet",
    description: "Captura email em troca de e-book/recurso.",
    type: "form",
    style: "tailwind",
    html: tw(
      "Lead Magnet",
      `<section class="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 flex items-center justify-center p-6">
  <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-10 text-center">
    <div class="text-5xl">📘</div>
    <h1 class="mt-4 text-2xl font-bold">Guia gratuito: 10 erros a evitar</h1>
    <p class="mt-2 text-slate-600">Download imediato em PDF · 24 páginas</p>
    <form class="mt-6 space-y-3">
      <input type="email" placeholder="o-teu@email.com" required class="w-full px-4 py-3 border rounded-lg" />
      <button class="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg">Enviar-me o guia</button>
    </form>
    <p class="mt-3 text-xs text-slate-500">Sem spam. Cancela quando quiseres.</p>
  </div>
</section>`,
    ),
  },

  // ========== NEWSLETTER (CSS inline para email) ==========
  {
    id: "newsletter-clean",
    name: "Newsletter Clean",
    description: "Template de email com CSS inline (compatível Outlook/Gmail).",
    type: "newsletter",
    style: "css-inline",
    html: `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Newsletter</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:32px;text-align:center;border-bottom:1px solid #e5e7eb;">
        <h1 style="margin:0;font-size:24px;color:#0f172a;">📨 A tua marca</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <h2 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Olá {{first_name}},</h2>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Esta é a tua newsletter mensal com as novidades mais importantes. Substitui este texto pelo teu conteúdo.</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">Esperamos que gostes!</p>
        <table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#0f172a;border-radius:8px;">
          <a href="https://exemplo.com" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">Ler artigo completo →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#64748b;">
        <p style="margin:0 0 8px;">© 2025 A tua marca</p>
        <p style="margin:0;"><a href="#" style="color:#64748b;">Cancelar subscrição</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  },
  {
    id: "newsletter-promo",
    name: "Newsletter Promocional",
    description: "Email com banner de oferta e CTA destacado.",
    type: "newsletter",
    style: "css-inline",
    html: `<!doctype html>
<html><head><meta charset="utf-8"><title>Promo</title></head>
<body style="margin:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#ea580c;color:#fff;padding:40px;text-align:center;">
        <p style="margin:0;font-size:14px;letter-spacing:2px;">OFERTA LIMITADA</p>
        <h1 style="margin:8px 0 0;font-size:42px;">-30% só hoje</h1>
      </td></tr>
      <tr><td style="padding:32px;text-align:center;">
        <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">Aproveita o desconto exclusivo para subscritores. Usa o código <strong>HOJE30</strong> no checkout.</p>
        <table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#ea580c;border-radius:8px;">
          <a href="#" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">Ir às compras →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:20px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e5e7eb;">© 2025 · <a href="#" style="color:#64748b;">Cancelar</a></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  },
];

export function getTemplatesForType(type: BuilderAssetType | "all"): BuilderTemplate[] {
  if (type === "all") return BUILDER_TEMPLATES;
  return BUILDER_TEMPLATES.filter((t) => t.type === type);
}

export function getTemplateById(id: string): BuilderTemplate | undefined {
  return BUILDER_TEMPLATES.find((t) => t.id === id);
}
