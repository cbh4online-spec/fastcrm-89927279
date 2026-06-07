# FastCRM — Matriz de Visibilidade das Rotas

Este documento define como cada família de rotas públicas, semipúblicas, técnicas ou autenticadas deve ser tratada no FastCRM.

O objetivo é impedir que páginas internas, portais, checkouts, links técnicos ou módulos secundários contaminem a navegação comercial principal.

---

## Estados oficiais de visibilidade

| Estado | Significado | Menu | SEO |
|---|---|---:|---:|
| `public_nav` | Página pública principal de navegação comercial | Sim | Indexável |
| `public_hidden` | Página pública acessível por link direto, mas fora do menu | Não | Condicional |
| `seo_indexable` | Página criada para tráfego orgânico e autoridade | Secundário/footer | Indexável |
| `noindex` | Página pública ou técnica que não deve aparecer no Google | Não | Noindex |
| `auth_required` | Página que exige autenticação | Não | Noindex |
| `token_only` | Página acessível apenas com token/link seguro | Não | Noindex |
| `legacy_redirect` | Rota antiga que redireciona para rota nova | Não | Noindex |
| `deprecated` | Rota a remover ou arquivar | Não | Noindex |

---

## Matriz principal

| Família | Exemplos | Visibilidade recomendada | Menu | SEO | Observação |
|---|---|---|---:|---:|---|
| Marketing comercial | `/`, `/funcionalidades`, `/precos`, `/casos`, `/sobre`, `/contacto` | `public_nav` | Sim | Index | Frente pública oficial |
| Oferta principal | `/fastcrm-whatsapp-sales` | `public_nav` | Sim | Index | Oferta de entrada atual |
| Landing pages | `/p/:slug`, `/funnel/:slug` | `public_hidden` | Não | Condicional | Usar para campanhas específicas |
| Landing legacy | `/lp/:workspaceSlug/:pageSlug` | `legacy_redirect` | Não | Noindex | Redirecionar para rota canónica |
| SEO/conteúdo | `/blog`, `/guides`, `/templates`, `/tools`, `/glossary`, `/compare` | `seo_indexable` | Secundário | Index | Atrair tráfego orgânico |
| Legal | `/privacy`, `/terms`, `/gdpr`, `/cookies` | `seo_indexable` | Footer | Index | Footer/legal |
| Loja | `/store/*` | `public_hidden` | Não | Condicional | Não misturar com posicionamento FastCRM |
| Marketplace | `/marketplace/*` | `public_hidden` | Não | Condicional | Rever antes de indexar |
| C2C legacy | `/c2c/*` | `legacy_redirect` | Não | Noindex | Redirecionar para marketplace |
| Checkout | `/checkout/*` | `noindex` | Não | Noindex | Fluxo transacional |
| Pagamento fatura | `/pay/invoice/:token` | `token_only` | Não | Noindex | Acesso por token |
| Portal cliente | `/client/*` | `auth_required` | Não | Noindex | Área autenticada |
| Portal parceiro | `/partner/*` | `auth_required` | Não | Noindex | Área autenticada |
| Supplier portal | `/supplier-portal/:token` | `token_only` | Não | Noindex | Acesso por token |
| Tickets | `/ticket/:token` | `token_only` | Não | Noindex | Acesso por token |
| Propostas | `/portal/proposal/:token` | `token_only` | Não | Noindex | Acesso por token |
| Onboarding | `/portal/onboarding/:token` | `token_only` | Não | Noindex | Acesso por token |
| Comunidade/FastClub | `/club/:slug/*`, `/fastclub` | `public_hidden` | Não | Condicional | Não competir com FastCRM comercial |
| Booking | `/book/:slug`, `/:workspaceSlug/book/:slug` | `public_hidden` | Não | Noindex | Link direto para marcações |
| Ebooks | `/ebook/:slug`, `/e/:shortCode` | `public_hidden` | Não | Condicional/noindex | Depende da estratégia de captação |
| Bio pages | `/bio/:workspaceSlug/:pageSlug`, `/b/:shortCode` | `public_hidden` | Não | Condicional/noindex | Páginas por link direto |
| Careers | `/careers/:workspaceSlug/*` | `public_hidden` | Não | Condicional | Portal de recrutamento |
| PWA install | `/install` | `noindex` | Não | Noindex | Rota técnica |
| Builder legacy | `/builder/*` | `legacy_redirect` | Não | Noindex | Redirecionar para dashboard |
| Dashboard/app | `/dashboard/*`, `/messages` | `auth_required` | Não | Noindex | Aplicação interna |

---

## Menu público final

Só estas páginas podem aparecer no menu principal:

- `/`
- `/fastcrm-whatsapp-sales`
- `/funcionalidades`
- `/precos`
- `/casos`
- `/sobre`
- `/contacto`
- `/contacto?tipo=demo` como CTA

---

## Regras práticas

### 1. Se vende o FastCRM diretamente
Usar `public_nav`.

### 2. Se vende uma campanha específica
Usar `public_hidden`.

### 3. Se é conteúdo para Google
Usar `seo_indexable`.

### 4. Se é checkout, token, pagamento ou recuperação
Usar `noindex` ou `token_only`.

### 5. Se exige login
Usar `auth_required`.

### 6. Se é rota antiga
Usar `legacy_redirect`.

### 7. Se já não tem função estratégica
Usar `deprecated`.

---

## Ficheiro técnico

A matriz operacional está definida em:

`src/config/publicRouteVisibility.ts`

Este ficheiro contém:

- tipos oficiais de visibilidade;
- famílias de rotas;
- proprietário interno;
- menu;
- estado SEO;
- autenticação;
- objetivo da rota;
- notas estratégicas.

---

## Critério de revisão mensal

Uma vez por mês, rever:

1. Páginas `public_nav` continuam a converter?
2. Páginas `public_hidden` ainda são necessárias?
3. Páginas `seo_indexable` têm tráfego ou devem ser melhoradas?
4. Rotas `legacy_redirect` ainda são necessárias?
5. Rotas `deprecated` podem ser removidas?
6. Alguma página técnica está indexada por engano?

---

## Princípio final

A matriz de visibilidade existe para proteger o posicionamento.

O FastCRM pode ter muitas rotas, mas o visitante deve ver apenas o caminho certo:

`Início → WhatsApp Sales → Funcionalidades → Preços → Casos → Contacto → Demo`
