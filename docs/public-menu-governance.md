# FastCRM — Menu Público Oficial

Este documento define o menu público oficial do FastCRM e as regras para impedir que páginas técnicas, portais e módulos secundários entrem na navegação principal.

---

## Objetivo

A navegação pública do FastCRM deve vender clareza.

O visitante deve perceber rapidamente:

1. O que é o FastCRM.
2. Qual é a oferta principal.
3. Que funcionalidades existem.
4. Quanto custa ou como pedir proposta.
5. Que casos de uso se aplicam.
6. Quem está por trás.
7. Como pedir demonstração.

---

## Menu público principal

O menu público principal deve conter apenas:

| Ordem | Label | URL | Função |
|---:|---|---|---|
| 1 | Início | `/` | Posicionamento principal do FastCRM |
| 2 | WhatsApp Sales | `/fastcrm-whatsapp-sales` | Oferta principal de entrada |
| 3 | Funcionalidades | `/funcionalidades` | Capacidades principais do produto |
| 4 | Preços | `/precos` | Planos e condições comerciais |
| 5 | Casos de Uso | `/casos` | Aplicações por setor ou contexto |
| 6 | Sobre | `/sobre` | Confiança, autoridade e contexto |
| 7 | Contacto | `/contacto` | Contacto comercial |
| CTA | Agendar Demo | `/contacto?tipo=demo` | Conversão direta |

---

## Regra central

O menu principal não é um mapa completo do produto.

O menu principal é uma ferramenta de conversão.

Por isso, não devem aparecer no menu principal:

- Loja
- Marketplace
- FastClub
- Comunidade
- Checkout
- Portal de cliente
- Portal de parceiro
- Portal de fornecedor
- Tickets
- Propostas por token
- Onboarding por token
- Páginas técnicas
- Rotas antigas
- Links curtos
- Páginas internas
- Dashboard
- Builder

---

## CTA oficial

O CTA principal deve ser:

`Agendar Demo`

URL:

`/contacto?tipo=demo`

Labels aceitáveis em contextos específicos:

- Agendar Demo
- Pedir Demonstração
- Ver o FastCRM em Ação
- Quero uma Demonstração

Evitar CTAs genéricos como:

- Saber mais
- Começar agora
- Entrar em contacto
- Clique aqui

---

## Entrada na aplicação

O botão `Entrar` pode existir, mas não deve competir visualmente com `Agendar Demo`.

Recomendação:

- Desktop: `Entrar` como botão secundário/discreto.
- Mobile: `Entrar` abaixo do CTA principal.
- Footer: pode aparecer em área de conta.

---

## Footer público

O footer pode conter mais links do que o menu principal, mas deve manter hierarquia.

### Produto

- WhatsApp Sales
- Funcionalidades
- Preços
- Casos de Uso

### Empresa

- Sobre
- Contacto
- Agendar Demo

### Recursos

- Blog
- Guias
- Templates
- Glossário

### Legal

- Privacidade
- Termos
- Cookies
- RGPD

### Conta

- Entrar
- Portal Cliente
- Portal Parceiro

---

## Rotas proibidas no menu principal

Estas rotas nunca devem aparecer na navegação pública principal:

- `/store/*`
- `/marketplace/*`
- `/c2c/*`
- `/checkout/*`
- `/client/*`
- `/partner/*`
- `/supplier-portal/*`
- `/ticket/*`
- `/portal/proposal/*`
- `/portal/onboarding/*`
- `/pay/invoice/*`
- `/builder/*`
- `/dashboard/*`
- `/messages`
- `/lp/*`
- `/funnel/*`
- `/bio/*`
- `/b/*`
- `/e/*`

---

## Ficheiro de configuração

O menu oficial deve ser mantido em:

`src/config/publicNavigation.ts`

Este ficheiro contém:

- `PUBLIC_PRIMARY_NAVIGATION`
- `PUBLIC_CTA_NAVIGATION`
- `PUBLIC_FOOTER_NAVIGATION`
- `PUBLIC_NAVIGATION_EXCLUSIONS`

Qualquer alteração ao menu público deve passar por este ficheiro.

---

## Critério para adicionar nova entrada ao menu

Antes de adicionar uma nova entrada ao menu principal, responder:

1. Esta página ajuda diretamente à conversão?
2. Esta página reforça o posicionamento principal do FastCRM?
3. Esta página é compreensível para um visitante novo?
4. Esta página deve competir por atenção com WhatsApp Sales?
5. Esta página está pronta para receber tráfego público?

Se a resposta não for claramente positiva, a página não entra no menu principal.

---

## Princípio final

O FastCRM pode ser grande por dentro, mas deve parecer simples por fora.

A navegação pública deve vender o caminho mais direto:

`Dor → Solução → Funcionalidades → Prova → Preço → Demo`
