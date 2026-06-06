# FastCRM — Categorias Oficiais de Páginas Públicas

Este documento define as 5 categorias oficiais de páginas do projeto FastCRM.

O objetivo é reduzir confusão comercial, separar páginas de venda de rotas técnicas e impedir que novas páginas públicas sejam criadas sem critério.

---

## 1. Páginas Públicas Comerciais

### Função
Páginas principais do site público FastCRM. Devem explicar, posicionar e vender o produto.

### Objetivo
Converter visitantes em pedidos de demonstração, contactos comerciais ou clientes.

### Devem aparecer no menu?
Sim.

### SEO
Indexáveis.

### Exemplos
- `/`
- `/fastcrm-whatsapp-sales`
- `/funcionalidades`
- `/precos`
- `/casos`
- `/sobre`
- `/contacto`
- `/book/demo`

### Regra
Só entram nesta categoria páginas com impacto direto na venda ou na confiança comercial.

---

## 2. Landing Pages de Campanha

### Função
Páginas criadas para campanhas específicas, segmentos, anúncios, lançamentos, ofertas Founder ou ações de prospeção.

### Objetivo
Captar leads qualificados para uma oferta concreta.

### Devem aparecer no menu?
Não, exceto quando a campanha for a oferta principal ativa.

### SEO
Normalmente `noindex`, salvo quando fizer sentido estratégico indexar.

### Exemplos
- `/fastcrm-whatsapp-sales`
- `/lp/:workspaceSlug/:pageSlug`
- `/p/:slug`
- `/funnel/:slug`

### Regra
Cada landing page deve ter uma promessa única, um público claro, um formulário e um CTA principal.

---

## 3. Portais Externos

### Função
Áreas públicas ou semipúblicas usadas por clientes, parceiros, fornecedores, candidatos, compradores ou utilizadores convidados.

### Objetivo
Dar acesso a funcionalidades específicas depois de uma interação comercial, compra, convite ou autenticação.

### Devem aparecer no menu?
Não no menu público principal. Podem aparecer no footer ou em áreas específicas quando fizer sentido.

### SEO
Normalmente `noindex`.

### Exemplos
- `/client/*`
- `/partner/*`
- `/supplier-portal/:token`
- `/ticket/:token`
- `/portal/proposal/:token`
- `/portal/onboarding/:token`
- `/careers/:workspaceSlug`
- `/store/:workspaceSlug/orders`

### Regra
Portais não devem competir com a mensagem comercial principal do FastCRM.

---

## 4. SEO e Conteúdo

### Função
Páginas de conteúdo, educação, autoridade, captação orgânica e suporte à estratégia de pesquisa.

### Objetivo
Atrair tráfego qualificado e educar o mercado.

### Devem aparecer no menu?
Podem aparecer em menu secundário, footer ou hub de recursos. Não devem sobrecarregar o menu principal.

### SEO
Indexáveis, salvo páginas duplicadas, fracas ou em construção.

### Exemplos
- `/blog`
- `/blog/:slug`
- `/guides`
- `/guides/:slug`
- `/templates`
- `/templates/:slug`
- `/tools`
- `/tools/:slug`
- `/glossary`
- `/glossary/:slug`
- `/privacy`
- `/terms`
- `/gdpr`
- `/cookies`

### Regra
Conteúdo SEO deve apoiar a autoridade comercial do FastCRM e não criar uma segunda proposta de valor concorrente.

---

## 5. Rotas Técnicas, Legado e Transacionais

### Função
Rotas necessárias para funcionamento técnico, redirecionamentos, checkout, tokens, recuperação, pagamentos, links curtos ou compatibilidade com versões antigas.

### Objetivo
Suportar processos técnicos e transacionais sem interferir na experiência pública principal.

### Devem aparecer no menu?
Nunca.

### SEO
`noindex` por defeito.

### Exemplos
- `/checkout/:funnelSlug`
- `/checkout/:funnelSlug/upsell/:offerId`
- `/checkout/:funnelSlug/downsell/:offerId`
- `/checkout/:funnelSlug/thank-you`
- `/checkout/recover/:token`
- `/pay/invoice/:token`
- `/b/:shortCode`
- `/e/:shortCode`
- `/c2c/:workspaceSlug/*`
- `/builder/:id`

### Regra
Rotas técnicas não devem ser promovidas, indexadas ou incluídas em navegação pública.

---

# Matriz de decisão rápida

| Pergunta | Categoria provável |
|---|---|
| Esta página vende o FastCRM? | Páginas Públicas Comerciais |
| Esta página vende uma campanha específica? | Landing Pages de Campanha |
| Esta página serve clientes/parceiros depois da compra ou convite? | Portais Externos |
| Esta página capta tráfego orgânico ou educa o mercado? | SEO e Conteúdo |
| Esta página existe por razões técnicas, token, checkout ou legado? | Rotas Técnicas, Legado e Transacionais |

---

# Regra obrigatória para novas páginas

Antes de criar uma nova página, responder:

1. Qual é a categoria da página?
2. Qual é o objetivo de negócio?
3. Deve aparecer no menu público?
4. Deve ser indexada no Google?
5. Quem é o proprietário interno da página?
6. Qual é o CTA principal?
7. Esta página reforça ou confunde o posicionamento do FastCRM?

Se estas respostas não estiverem claras, a página não deve ser publicada.

---

# Menu público recomendado

O menu público principal do FastCRM deve ser reduzido a:

- Início
- WhatsApp Sales
- Funcionalidades
- Preços
- Casos de Uso
- Sobre
- Contacto
- Agendar Demo

Todas as outras páginas devem ficar como landing pages ocultas, portais, conteúdo SEO, rotas técnicas ou módulos internos.

---

# Princípio de governança

O FastCRM pode ter muitos módulos, mas a frente pública deve ser simples.

A página pública principal vende clareza.
As landing pages vendem campanhas.
Os portais servem utilizadores.
O SEO atrai mercado.
As rotas técnicas sustentam o sistema.
