# FastCRM — Ficheiro de Controlo Final da Frente Pública

Este documento é a referência central de governança da frente pública do FastCRM.

O objetivo é impedir dispersão, excesso de páginas, confusão comercial e mistura entre produto principal, módulos, portais, campanhas, SEO e rotas técnicas.

---

## Decisão estratégica principal

O FastCRM deve parecer simples por fora e poderoso por dentro.

A comunicação pública deve vender uma promessa clara:

> O FastCRM ajuda empresas a organizar leads, conversas, oportunidades, reuniões e follow-ups com inteligência artificial.

A oferta principal de entrada é:

> FastCRM WhatsApp Sales — transforme o WhatsApp num canal organizado de vendas.

---

## Documentos de governança relacionados

| Documento | Função |
|---|---|
| `docs/public-page-categories.md` | Define as 5 categorias oficiais de páginas |
| `docs/public-menu-governance.md` | Define o menu público oficial |
| `docs/public-route-visibility-matrix.md` | Define a visibilidade das famílias de rotas |
| `docs/product-vs-modules-architecture.md` | Separa produto principal, oferta de entrada e módulos |

---

## Ficheiros técnicos relacionados

| Ficheiro | Função |
|---|---|
| `src/config/publicNavigation.ts` | Fonte oficial do menu público, CTA, footer e exclusões |
| `src/config/publicRouteVisibility.ts` | Matriz técnica de visibilidade das rotas |
| `src/config/productArchitecture.ts` | Arquitetura técnica de produto, módulos e verticais |

---

# 1. Categorias oficiais de páginas

Todas as páginas públicas ou externas devem pertencer a uma destas categorias.

| Categoria | Função | Menu público | SEO |
|---|---|---:|---:|
| Páginas Públicas Comerciais | Vender e posicionar o FastCRM | Sim | Indexável |
| Landing Pages de Campanha | Captar leads de campanhas específicas | Não, salvo exceção | Normalmente noindex |
| Portais Externos | Cliente, parceiro, fornecedor, ticket, proposta, onboarding | Não | Normalmente noindex |
| SEO e Conteúdo | Blog, guias, templates, glossary, legal | Menu secundário/footer | Indexável |
| Rotas Técnicas, Legado e Transacionais | Checkout, tokens, redirects, links curtos, recuperação | Nunca | Noindex |

---

# 2. Menu público oficial

O menu público principal do FastCRM deve conter apenas:

| Ordem | Label | URL | Função |
|---:|---|---|---|
| 1 | Início | `/` | Posicionamento principal |
| 2 | WhatsApp Sales | `/fastcrm-whatsapp-sales` | Oferta principal de entrada |
| 3 | Funcionalidades | `/funcionalidades` | Capacidades principais |
| 4 | Preços | `/precos` | Planos e condições comerciais |
| 5 | Casos de Uso | `/casos` | Aplicações por setor |
| 6 | Sobre | `/sobre` | Confiança e autoridade |
| 7 | Contacto | `/contacto` | Contacto comercial |
| CTA | Agendar Demo | `/contacto?tipo=demo` | Conversão direta |

## Regra

O menu principal não é um mapa completo do produto.

O menu principal é uma ferramenta de conversão.

---

# 3. Caminho público de conversão

A navegação pública deve conduzir o visitante por este caminho:

```text
Dor → Solução → Funcionalidades → Prova → Preço → Demo
```

Aplicação prática:

```text
Início → WhatsApp Sales → Funcionalidades → Casos de Uso → Preços → Contacto → Agendar Demo
```

---

# 4. Matriz de visibilidade

Todos os padrões de URL devem ter um dos seguintes estados:

| Estado | Significado | Menu | SEO |
|---|---|---:|---:|
| `public_nav` | Página pública principal de navegação comercial | Sim | Indexável |
| `public_hidden` | Página pública acessível por link direto | Não | Condicional |
| `seo_indexable` | Página criada para tráfego orgânico e autoridade | Secundário/footer | Indexável |
| `noindex` | Página pública ou técnica que não deve aparecer no Google | Não | Noindex |
| `auth_required` | Página que exige autenticação | Não | Noindex |
| `token_only` | Página acessível apenas com token/link seguro | Não | Noindex |
| `legacy_redirect` | Rota antiga que redireciona para rota nova | Não | Noindex |
| `deprecated` | Rota a remover ou arquivar | Não | Noindex |

---

# 5. Rotas que podem aparecer no menu principal

Apenas estas:

```text
/
/fastcrm-whatsapp-sales
/funcionalidades
/precos
/casos
/sobre
/contacto
/contacto?tipo=demo
```

---

# 6. Rotas proibidas no menu principal

Estas rotas nunca devem aparecer no menu público principal:

```text
/store/*
/marketplace/*
/c2c/*
/checkout/*
/client/*
/partner/*
/supplier-portal/*
/ticket/*
/portal/proposal/*
/portal/onboarding/*
/pay/invoice/*
/builder/*
/dashboard/*
/messages
/lp/*
/funnel/*
/bio/*
/b/*
/e/*
```

---

# 7. Produto principal vs módulos

## Produto-mãe

```text
FastCRM
```

## Oferta principal de entrada

```text
FastCRM WhatsApp Sales
```

## Módulos centrais da oferta

```text
Contactos e Empresas
Leads
Pipeline Comercial
Inbox Comercial
Tarefas e Follow-up
Reuniões e Agendamento
IA Comercial
Dashboard Comercial
Automações Comerciais
```

## Módulos opcionais

```text
Portal Cliente
Loja Online
Marketplace
SEO Hub
FastClub / Comunidade
Compras / Procurement
Faturação
Performance e Gamificação
```

## Verticais comerciais

```text
FastCRM Clínicas
FastCRM Formação
FastCRM Imobiliário
```

---

# 8. Regra de comunicação pública

Não comunicar o FastCRM assim:

> CRM + loja + marketplace + comunidade + IA + procurement + portal cliente + faturação + SEO + gamificação.

Comunicar assim:

> O FastCRM ajuda a sua empresa a deixar de perder leads por falta de organização e follow-up. Começamos pelo WhatsApp Sales e depois ativamos módulos adicionais conforme o vosso processo.

---

# 9. O que aparece publicamente agora

## Deve aparecer

- FastCRM
- FastCRM WhatsApp Sales
- Funcionalidades principais
- Preços
- Casos de Uso
- Contacto
- Agendar Demo

## Pode aparecer em contexto secundário

- Blog
- Guias
- Templates
- Glossário
- Política de Privacidade
- Termos
- Cookies
- RGPD

## Não deve aparecer como promessa principal

- Marketplace
- Loja Online
- FastClub
- Comunidade
- Compras / Procurement
- Gamificação avançada
- Portal Cliente
- Portal Parceiro
- Checkout
- Token pages
- Dashboard
- Builder

---

# 10. Regras para criar novas páginas

Antes de criar qualquer nova página, responder obrigatoriamente:

1. Qual é a categoria da página?
2. Qual é o objetivo de negócio?
3. Deve aparecer no menu principal?
4. Deve ser indexada no Google?
5. Quem é o proprietário interno?
6. Qual é o CTA principal?
7. Esta página reforça ou confunde o posicionamento do FastCRM?
8. A página vende produto, campanha, conteúdo, portal ou processo técnico?
9. Existe uma página atual que já cumpre esta função?
10. Qual é o critério para remover ou rever esta página no futuro?

Se estas respostas não estiverem claras, a página não deve ser publicada.

---

# 11. Regras para criar novas ofertas

Antes de criar uma nova oferta comercial, responder:

1. A oferta é produto principal, vertical, módulo ou campanha?
2. A oferta compete com FastCRM WhatsApp Sales?
3. A oferta deve ter página pública ou landing page oculta?
4. Qual é a dor específica que resolve?
5. Qual é o público-alvo?
6. Qual é o preço ou modelo comercial?
7. Qual é o CTA?
8. Qual é o percurso depois do lead entrar?
9. A oferta aumenta clareza ou cria dispersão?
10. Quem acompanha comercialmente esta oferta?

---

# 12. Regra de SEO

## Indexar

- Página principal
- WhatsApp Sales
- Funcionalidades
- Preços
- Casos
- Sobre
- Contacto
- Blog
- Guias
- Templates
- Tools
- Glossary
- Compare
- Legal pages

## Noindex por defeito

- Checkout
- Pagamentos por token
- Tickets por token
- Propostas por token
- Onboarding por token
- Dashboards
- Portais autenticados
- Recuperação de carrinho
- Links curtos
- Rotas legacy
- Builder
- Mensagens internas

## Condicional

- Landing pages
- Store
- Marketplace
- Careers
- Ebooks
- Bio pages
- Community pages

---

# 13. Regra de ownership

Cada página ou família de rotas deve ter proprietário.

| Área | Owner recomendado |
|---|---|
| Marketing público | Marketing |
| WhatsApp Sales | Sales |
| Preços | Sales |
| Conteúdo SEO | Growth |
| Portais | Product |
| Tickets | Support |
| Checkout | Product |
| Legal | Legal |
| Rotas técnicas | Engineering |
| Dashboard | Product |

---

# 14. Checklist antes de publicar

Antes de publicar uma nova página pública:

- [ ] Categoria definida
- [ ] Visibilidade definida
- [ ] Owner definido
- [ ] CTA definido
- [ ] SEO definido
- [ ] Menu definido
- [ ] Formulário ou destino do CTA definido
- [ ] Próximo passo comercial definido
- [ ] Não duplica página existente
- [ ] Não confunde a promessa FastCRM
- [ ] Mobile validado
- [ ] Mensagem de obrigado validada, se houver formulário
- [ ] Lead entra no CRM/pipeline correto, se aplicável

---

# 15. Checklist mensal de governança

Uma vez por mês, rever:

- [ ] Páginas `public_nav` continuam alinhadas com a oferta principal?
- [ ] Páginas `public_hidden` ainda são necessárias?
- [ ] Páginas `seo_indexable` têm tráfego ou precisam de melhoria?
- [ ] Páginas `noindex` estão realmente fora do Google?
- [ ] Rotas `legacy_redirect` ainda são necessárias?
- [ ] Rotas `deprecated` podem ser removidas?
- [ ] O menu principal continua simples?
- [ ] Algum módulo secundário está a competir com WhatsApp Sales?
- [ ] Alguma nova página foi criada sem owner?
- [ ] Alguma campanha ficou ativa sem prazo de revisão?

---

# 16. Critério de decisão rápida

## Deve estar no menu principal?

Sim, apenas se vender ou reforçar diretamente o FastCRM.

## Deve ficar pública mas escondida?

Sim, se for campanha, landing page, booking, ebook, bio page ou página contextual.

## Deve ser indexada?

Sim, se tiver valor SEO e conteúdo público estável.

## Deve ser noindex?

Sim, se for técnica, transacional, token-based, checkout ou portal.

## Deve ser removida?

Sim, se não tiver tráfego, conversão, função técnica ou owner.

---

# 17. Frase de controlo estratégico

Sempre que houver dúvida, aplicar esta frase:

> Esta página ajuda o cliente a perceber e comprar o FastCRM ou apenas mostra que o sistema tem muitas coisas?

Se apenas mostra complexidade, não deve entrar na frente pública principal.

---

# 18. Decisão final

A frente pública do FastCRM deve permanecer simples:

```text
Início
WhatsApp Sales
Funcionalidades
Preços
Casos de Uso
Sobre
Contacto
Agendar Demo
```

Todos os outros ativos devem ser tratados como:

```text
Campanhas
Portais
SEO
Módulos
Rotas técnicas
Legado
Áreas autenticadas
```

---

# Princípio final

O FastCRM vende clareza.

A complexidade fica dentro do produto.
A simplicidade fica fora.
