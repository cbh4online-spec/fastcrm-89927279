

# Expandir Tipos de Step nos Funis

## Diagnóstico

Actualmente existem apenas **7 tipos de step**: Página, Opt-in, Checkout, Thank You, Upsell, Testemunhos e Vídeo. Faltam tipos essenciais do mercado (downsell, squeeze, webinar, order bump, etc.) e não há possibilidade de criar tipos personalizados.

## Plano

### 1. Expandir tipos de step disponíveis

Adicionar os tipos em falta ao sistema (select de criação, ícones, cores, editor, renderização pública):

| Tipo | Chave | Ícone | Descrição |
|---|---|---|---|
| **Downsell** | `downsell` | 📉 | Oferta alternativa mais acessível |
| **Order Bump** | `order_bump` | 🎁 | Adição rápida pré-checkout |
| **Squeeze Page** | `squeeze` | 🔒 | Captura agressiva, sem navegação |
| **Webinar** | `webinar` | 🎥 | Registo/replay de webinar |
| **Sales Letter** | `sales_letter` | 📝 | Carta de vendas longa |
| **Aplicação/Candidatura** | `application` | 📄 | Formulário de qualificação |
| **Agendamento** | `booking` | 📅 | Integração com booking pages |
| **Bridging/Pré-sell** | `bridge` | 🌉 | Página de aquecimento entre anúncio e oferta |
| **Countdown/Escassez** | `countdown` | ⏰ | Página com timer de urgência |
| **Tripwire** | `tripwire` | ⚡ | Oferta de baixo valor para converter lead |
| **Membership** | `membership` | 🔑 | Acesso a área de membros |
| **Custom** | `custom` | 🧩 | Tipo personalizado definido pelo utilizador |

### 2. Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/funnels/tabs/FunnelStepsTab.tsx` | Expandir `STEP_TYPE_ICONS`, `STEP_TYPE_COLORS` e o `<Select>` com todos os novos tipos; agrupar por categoria (Captura, Venda, Pós-venda, Conteúdo, Outros) |
| `src/components/funnels/FunnelStepEditor.tsx` | Expandir `AI_SUGGESTIONS` com prompts para os novos tipos; adicionar campos específicos (ex: countdown config, booking link, membership URL) |
| `src/pages/PublicFunnelPage.tsx` | Expandir `STEP_TYPE_ICONS` e renderização para novos tipos (countdown timer, formulário de aplicação, embed de webinar, etc.) |
| `src/components/funnels/FunnelsList.tsx` | Sem alteração (já usa `step_type` genérico) |

### 3. Campos específicos por tipo no editor

- **countdown**: data/hora alvo, texto expirado, acção ao expirar (redirecionar ou esconder)
- **webinar**: URL do vídeo, data do evento, formulário de registo
- **booking**: link para booking page existente (integração com `booking_pages`)
- **application**: campos customizados de formulário (reutilizar lógica do optin)
- **squeeze**: igual ao optin mas com flag `hide_navigation = true`
- **bridge**: igual a página mas com CTA pré-configurado
- **membership**: URL de acesso, instruções
- **custom**: nome do tipo personalizável, campos livres

### 4. Agrupamento visual no selector

```text
── Captura ──
  📋 Opt-in
  🔒 Squeeze Page
  📄 Aplicação/Candidatura
  📅 Agendamento

── Venda ──
  💳 Checkout
  🎁 Order Bump
  🚀 Upsell
  📉 Downsell
  ⚡ Tripwire
  📝 Sales Letter

── Conteúdo ──
  🏠 Página
  🎬 Vídeo
  ⭐ Testemunhos
  🎥 Webinar
  🌉 Bridge/Pré-sell
  ⏰ Countdown

── Outros ──
  🔑 Membership
  ✅ Thank You
  🧩 Custom
```

### Critérios de aceitação
- Todos os novos tipos aparecem no selector agrupados por categoria
- Cada tipo tem ícone, cor e sugestões AI dedicadas
- Campos específicos (countdown, booking, etc.) aparecem condicionalmente no editor
- Tipo "Custom" permite nome livre
- Renderização pública suporta todos os novos tipos
- Sem alteração à base de dados (step_type já é text livre)

