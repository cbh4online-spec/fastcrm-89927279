

# Plano: Corrigir Responsive Mobile da Inbox

## Diagnóstico

A partir do screenshot e análise do código, identifico os seguintes problemas no mobile:

1. **Header da InboxView** — Botões, métricas e pesquisa todos em linha, causando overflow horizontal
2. **SalesInboxColumns** — 4 colunas lado a lado (`flex`) impossíveis de usar em ecrãs < 768px
3. **Lista de conversas** — Larguras fixas (`w-80`/`w-96`) que não se adaptam ao mobile
4. **Painel de detalhe** — Não tem lógica de navegação mobile (mostrar lista OU detalhe, não ambos)
5. **InboxMetricsBar** — Métricas + ferramentas inline sem wrap para mobile

## Plano de Implementação

### 1. InboxView — Layout mobile-first
- **Header**: Esconder botões secundários (atalhos, toggle view, painel CRM) em `hidden md:flex`; manter apenas sidebar toggle e compose
- **Pesquisa**: Em mobile, mover para baixo do header ou tornar colapsável
- **Lista/Detalhe**: Implementar padrão master-detail mobile:
  - Mobile (`< lg`): Mostrar lista OU detalhe (nunca ambos)
  - Quando `selectedConversationId` está definido → esconder lista, mostrar detalhe com botão voltar
  - Quando sem selecção → mostrar lista full-width
- **ConversationList**: Remover largura fixa, usar `w-full` em mobile

### 2. SalesInboxColumns — Scrollável horizontal ou empilhado
- Em mobile (`< md`): Converter para layout vertical empilhado com accordion/tabs por grupo
- Ou: Scroll horizontal com snap para cada coluna (cada coluna ocupa ~85vw)

### 3. InboxMetricsBar — Compactar
- Em mobile: Mostrar apenas contadores essenciais (abertas + não lidas)
- Esconder botões de sync e toggles em `hidden md:flex`

### 4. ConversationDetail — Botão voltar
- Adicionar botão `← Voltar` no topo do detalhe quando em mobile
- Ao clicar, limpar `selectedConversationId`

## Ficheiros a Modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/inbox/InboxView.tsx` | Layout master-detail mobile, header responsive |
| `src/components/inbox/SalesInboxColumns.tsx` | Scroll horizontal com snap em mobile |
| `src/components/inbox/InboxMetricsBar.tsx` | Compactar para mobile |
| `src/components/inbox/ConversationDetail.tsx` | Botão voltar em mobile |

## Critérios de Aceitação

- Nenhum overflow horizontal em ecrãs ≤ 414px
- Navegação lista → detalhe → lista funcional em mobile
- Todos os elementos visíveis e clicáveis sem sobreposição
- Header não ultrapassa 1 linha em mobile
- Columns view usável em mobile (scroll horizontal ou tabs)

