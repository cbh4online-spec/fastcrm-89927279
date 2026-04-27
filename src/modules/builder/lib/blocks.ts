// Built-in HTML blocks library — Tailwind-based snippets

export type BuilderBlockCategory =
  | "hero"
  | "cta"
  | "features"
  | "pricing"
  | "faq"
  | "testimonials"
  | "footer"
  | "form"
  | "header"
  | "stats"
  | "custom";

export interface BuilderBuiltInBlock {
  id: string;
  name: string;
  category: BuilderBlockCategory;
  description: string;
  html: string;
}

export const BLOCK_CATEGORY_LABEL: Record<BuilderBlockCategory, string> = {
  hero: "Hero",
  cta: "CTA",
  features: "Features",
  pricing: "Preços",
  faq: "FAQ",
  testimonials: "Testemunhos",
  footer: "Footer",
  form: "Formulário",
  header: "Header",
  stats: "Estatísticas",
  custom: "Personalizado",
};

export const BUILTIN_BLOCKS: BuilderBuiltInBlock[] = [
  // HEADER
  {
    id: "header-simple",
    name: "Header simples",
    category: "header",
    description: "Logo + navegação + CTA",
    html: `<header class="border-b">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="#" class="font-semibold text-lg">Marca</a>
    <nav class="hidden md:flex gap-6 text-sm text-slate-600">
      <a href="#" class="hover:text-slate-900">Funcionalidades</a>
      <a href="#" class="hover:text-slate-900">Preços</a>
      <a href="#" class="hover:text-slate-900">Contacto</a>
    </nav>
    <a href="#" class="text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white">Entrar</a>
  </div>
</header>`,
  },

  // HERO
  {
    id: "hero-centered",
    name: "Hero centrado",
    category: "hero",
    description: "Título grande + subtítulo + 2 CTAs",
    html: `<section class="max-w-5xl mx-auto px-6 py-24 text-center">
  <h1 class="text-5xl md:text-6xl font-bold tracking-tight">Constrói algo notável</h1>
  <p class="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">Uma proposta de valor clara em uma frase ou duas.</p>
  <div class="mt-8 flex gap-3 justify-center">
    <a href="#" class="px-6 py-3 rounded-lg bg-slate-900 text-white font-medium">Começar grátis</a>
    <a href="#" class="px-6 py-3 rounded-lg border border-slate-300 font-medium">Ver demo</a>
  </div>
</section>`,
  },
  {
    id: "hero-split",
    name: "Hero dividido",
    category: "hero",
    description: "Texto à esquerda, imagem à direita",
    html: `<section class="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
  <div>
    <h1 class="text-4xl md:text-5xl font-bold leading-tight">Headline persuasivo</h1>
    <p class="mt-4 text-lg text-slate-600">Subheadline curto que reforça o benefício principal.</p>
    <a class="inline-block mt-6 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium" href="#">Começar →</a>
  </div>
  <div class="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl border"></div>
</section>`,
  },

  // FEATURES
  {
    id: "features-3col",
    name: "Features 3 colunas",
    category: "features",
    description: "Grid de 3 benefícios com ícone",
    html: `<section class="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8">
  <div><div class="h-10 w-10 rounded-lg bg-slate-900 mb-4"></div><h3 class="font-semibold">Rápido</h3><p class="text-sm text-slate-600 mt-1">Performance optimizada.</p></div>
  <div><div class="h-10 w-10 rounded-lg bg-slate-900 mb-4"></div><h3 class="font-semibold">Simples</h3><p class="text-sm text-slate-600 mt-1">Setup em minutos.</p></div>
  <div><div class="h-10 w-10 rounded-lg bg-slate-900 mb-4"></div><h3 class="font-semibold">Escalável</h3><p class="text-sm text-slate-600 mt-1">Cresce contigo.</p></div>
</section>`,
  },
  {
    id: "features-alt",
    name: "Features alternadas",
    category: "features",
    description: "Linhas alternadas texto/imagem",
    html: `<section class="max-w-6xl mx-auto px-6 py-20 space-y-20">
  <div class="grid md:grid-cols-2 gap-10 items-center">
    <div><h2 class="text-3xl font-bold">Funcionalidade #1</h2><p class="mt-3 text-slate-600">Descreve o benefício principal. Explica como resolve um problema real do utilizador.</p></div>
    <div class="aspect-video bg-slate-100 rounded-xl"></div>
  </div>
  <div class="grid md:grid-cols-2 gap-10 items-center">
    <div class="aspect-video bg-slate-100 rounded-xl md:order-1"></div>
    <div class="md:order-2"><h2 class="text-3xl font-bold">Funcionalidade #2</h2><p class="mt-3 text-slate-600">Outro benefício importante, com prova ou número quando possível.</p></div>
  </div>
</section>`,
  },

  // STATS
  {
    id: "stats-3",
    name: "Estatísticas 3 cols",
    category: "stats",
    description: "Métricas-chave em destaque",
    html: `<section class="bg-slate-50 py-16">
  <div class="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
    <div><div class="text-5xl font-bold text-slate-900">+38%</div><p class="text-sm text-slate-600 mt-2">Conversão média</p></div>
    <div><div class="text-5xl font-bold text-slate-900">2.4x</div><p class="text-sm text-slate-600 mt-2">Velocidade</p></div>
    <div><div class="text-5xl font-bold text-slate-900">98%</div><p class="text-sm text-slate-600 mt-2">Satisfação</p></div>
  </div>
</section>`,
  },

  // CTA
  {
    id: "cta-banner",
    name: "CTA banner",
    category: "cta",
    description: "Faixa escura com CTA centrado",
    html: `<section class="bg-slate-950 text-white py-20">
  <div class="max-w-3xl mx-auto px-6 text-center">
    <h2 class="text-3xl md:text-4xl font-bold">Pronto para começar?</h2>
    <p class="mt-3 text-slate-400">Junta-te a milhares de equipas que já confiam em nós.</p>
    <a href="#" class="inline-block mt-6 px-8 py-3 bg-white text-slate-950 font-semibold rounded-lg">Experimenta grátis</a>
  </div>
</section>`,
  },
  {
    id: "cta-inline",
    name: "CTA inline",
    category: "cta",
    description: "Bloco compacto com fundo claro",
    html: `<section class="max-w-4xl mx-auto px-6 py-12 my-10 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
  <div><h3 class="text-xl font-bold">Oferta limitada</h3><p class="text-sm text-amber-900">Aproveita -30% até ao fim do mês.</p></div>
  <a href="#" class="px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg">Aproveitar</a>
</section>`,
  },

  // PRICING
  {
    id: "pricing-3plans",
    name: "Pricing 3 planos",
    category: "pricing",
    description: "Tabela de 3 planos com destaque",
    html: `<section class="max-w-6xl mx-auto px-6 py-20">
  <div class="text-center mb-12"><h2 class="text-3xl font-bold">Planos simples</h2><p class="text-slate-600 mt-2">Escolhe o que se adapta a ti.</p></div>
  <div class="grid md:grid-cols-3 gap-6">
    <div class="border rounded-2xl p-8"><h3 class="font-semibold">Starter</h3><div class="mt-3 text-4xl font-bold">€9<span class="text-base font-normal text-slate-500">/mês</span></div><ul class="mt-6 space-y-2 text-sm text-slate-600"><li>✓ 1 utilizador</li><li>✓ 10 projectos</li><li>✓ Suporte email</li></ul><a href="#" class="block mt-6 text-center py-2 border rounded-lg font-medium">Começar</a></div>
    <div class="border-2 border-slate-900 rounded-2xl p-8 relative"><span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full">Popular</span><h3 class="font-semibold">Pro</h3><div class="mt-3 text-4xl font-bold">€29<span class="text-base font-normal text-slate-500">/mês</span></div><ul class="mt-6 space-y-2 text-sm text-slate-600"><li>✓ 5 utilizadores</li><li>✓ Projectos ilimitados</li><li>✓ Suporte prioritário</li></ul><a href="#" class="block mt-6 text-center py-2 bg-slate-900 text-white rounded-lg font-medium">Escolher Pro</a></div>
    <div class="border rounded-2xl p-8"><h3 class="font-semibold">Empresa</h3><div class="mt-3 text-4xl font-bold">€99<span class="text-base font-normal text-slate-500">/mês</span></div><ul class="mt-6 space-y-2 text-sm text-slate-600"><li>✓ Utilizadores ilimitados</li><li>✓ SLA dedicado</li><li>✓ Onboarding</li></ul><a href="#" class="block mt-6 text-center py-2 border rounded-lg font-medium">Falar com vendas</a></div>
  </div>
</section>`,
  },

  // TESTIMONIALS
  {
    id: "testimonials-grid",
    name: "Testemunhos grid",
    category: "testimonials",
    description: "3 cartões com citações",
    html: `<section class="bg-slate-50 py-20">
  <div class="max-w-6xl mx-auto px-6">
    <h2 class="text-3xl font-bold text-center mb-12">O que dizem de nós</h2>
    <div class="grid md:grid-cols-3 gap-6">
      <div class="bg-white p-6 rounded-xl border"><p class="text-slate-700">"Mudou completamente a forma como trabalhamos."</p><div class="mt-4 flex items-center gap-3"><div class="h-10 w-10 rounded-full bg-slate-200"></div><div><p class="text-sm font-semibold">Ana Silva</p><p class="text-xs text-slate-500">CEO · Acme</p></div></div></div>
      <div class="bg-white p-6 rounded-xl border"><p class="text-slate-700">"Melhor investimento do ano para a equipa."</p><div class="mt-4 flex items-center gap-3"><div class="h-10 w-10 rounded-full bg-slate-200"></div><div><p class="text-sm font-semibold">João Costa</p><p class="text-xs text-slate-500">CTO · Beta</p></div></div></div>
      <div class="bg-white p-6 rounded-xl border"><p class="text-slate-700">"Suporte excelente e produto sólido."</p><div class="mt-4 flex items-center gap-3"><div class="h-10 w-10 rounded-full bg-slate-200"></div><div><p class="text-sm font-semibold">Maria Santos</p><p class="text-xs text-slate-500">Lead · Gamma</p></div></div></div>
    </div>
  </div>
</section>`,
  },

  // FAQ
  {
    id: "faq-accordion",
    name: "FAQ acordeão",
    category: "faq",
    description: "Lista de perguntas frequentes",
    html: `<section class="max-w-3xl mx-auto px-6 py-20">
  <h2 class="text-3xl font-bold text-center mb-10">Perguntas frequentes</h2>
  <div class="space-y-3">
    <details class="group border rounded-lg p-4"><summary class="font-medium cursor-pointer flex justify-between">Como começo? <span class="group-open:rotate-180 transition">▾</span></summary><p class="mt-3 text-slate-600 text-sm">Cria conta grátis em menos de 2 minutos.</p></details>
    <details class="group border rounded-lg p-4"><summary class="font-medium cursor-pointer flex justify-between">Posso cancelar? <span class="group-open:rotate-180 transition">▾</span></summary><p class="mt-3 text-slate-600 text-sm">Sim, sem fidelização e sem perguntas.</p></details>
    <details class="group border rounded-lg p-4"><summary class="font-medium cursor-pointer flex justify-between">Há suporte? <span class="group-open:rotate-180 transition">▾</span></summary><p class="mt-3 text-slate-600 text-sm">Sim, equipa humana 24/7 nos planos Pro e Empresa.</p></details>
  </div>
</section>`,
  },

  // FORM
  {
    id: "form-newsletter",
    name: "Newsletter inline",
    category: "form",
    description: "Captura de email simples",
    html: `<section class="bg-slate-100 py-16">
  <div class="max-w-xl mx-auto px-6 text-center">
    <h2 class="text-2xl font-bold">Subscreve a newsletter</h2>
    <p class="text-slate-600 mt-2">Recebe novidades 1x por mês.</p>
    <form class="mt-6 flex flex-col sm:flex-row gap-3"><input type="email" placeholder="o-teu@email.com" required class="flex-1 px-4 py-3 rounded-lg border" /><button class="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg">Subscrever</button></form>
  </div>
</section>`,
  },
  {
    id: "form-contact",
    name: "Contacto completo",
    category: "form",
    description: "Nome + email + mensagem",
    html: `<section class="max-w-md mx-auto px-6 py-12">
  <form class="space-y-4">
    <div><label class="block text-sm font-medium mb-1">Nome</label><input type="text" required class="w-full px-3 py-2 border rounded-lg" /></div>
    <div><label class="block text-sm font-medium mb-1">Email</label><input type="email" required class="w-full px-3 py-2 border rounded-lg" /></div>
    <div><label class="block text-sm font-medium mb-1">Mensagem</label><textarea rows="5" required class="w-full px-3 py-2 border rounded-lg"></textarea></div>
    <button class="w-full py-3 bg-slate-900 text-white font-medium rounded-lg">Enviar</button>
  </form>
</section>`,
  },

  // FOOTER
  {
    id: "footer-simple",
    name: "Footer minimalista",
    category: "footer",
    description: "Linha única com copyright",
    html: `<footer class="border-t py-8 text-center text-sm text-slate-500">© 2025 Marca · <a href="#" class="hover:text-slate-900">Privacidade</a> · <a href="#" class="hover:text-slate-900">Termos</a></footer>`,
  },
  {
    id: "footer-cols",
    name: "Footer 4 colunas",
    category: "footer",
    description: "Sitemap + redes sociais",
    html: `<footer class="bg-slate-950 text-slate-400 py-16">
  <div class="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
    <div><h4 class="text-white font-semibold mb-3">Produto</h4><ul class="space-y-2"><li><a href="#" class="hover:text-white">Funcionalidades</a></li><li><a href="#" class="hover:text-white">Preços</a></li><li><a href="#" class="hover:text-white">Changelog</a></li></ul></div>
    <div><h4 class="text-white font-semibold mb-3">Empresa</h4><ul class="space-y-2"><li><a href="#" class="hover:text-white">Sobre</a></li><li><a href="#" class="hover:text-white">Carreiras</a></li><li><a href="#" class="hover:text-white">Blog</a></li></ul></div>
    <div><h4 class="text-white font-semibold mb-3">Recursos</h4><ul class="space-y-2"><li><a href="#" class="hover:text-white">Documentação</a></li><li><a href="#" class="hover:text-white">Suporte</a></li><li><a href="#" class="hover:text-white">API</a></li></ul></div>
    <div><h4 class="text-white font-semibold mb-3">Legal</h4><ul class="space-y-2"><li><a href="#" class="hover:text-white">Privacidade</a></li><li><a href="#" class="hover:text-white">Termos</a></li><li><a href="#" class="hover:text-white">Cookies</a></li></ul></div>
  </div>
  <div class="max-w-6xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 text-xs">© 2025 Marca. Todos os direitos reservados.</div>
</footer>`,
  },
];

export function getBlocksByCategory(category: BuilderBlockCategory | "all"): BuilderBuiltInBlock[] {
  if (category === "all") return BUILTIN_BLOCKS;
  return BUILTIN_BLOCKS.filter((b) => b.category === category);
}
