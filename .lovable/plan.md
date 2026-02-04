

# Plano: Simplificar e Tornar o Inbox Mais Funcional

## Problemas Identificados

Após analisar o código, identifiquei as seguintes fontes de confusão:

| Problema | Causa | Impacto |
|----------|-------|---------|
| **Barra de métricas sobrecarregada** | 10+ elementos (métricas, sync, autopilot, compose, alerts) numa só linha | Difícil identificar acções importantes |
| **Sidebar + Tabs duplicados** | Filtro de canais aparece no Sidebar E nas Tabs da lista | Redundância confusa |
| **Detalhe da conversa poluído** | 6+ banners (Summary, Tags, Safety, Autopilot, Follow-up, Opportunity) antes das mensagens | O conteúdo principal fica escondido |
| **Painel CRM muito longo** | 400+ linhas de informação numa scroll infinita | Informação importante misturada com secundária |
| **Acções espalhadas** | Botões de acção em múltiplos locais (header, menus, banners) | Utilizador não sabe onde clicar |

## Arquitectura Actual

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Metrics] [Open:5] [Unread:3] [>2h:2] [Alerts] [AutoPilot] [Sync▾] [New] [...]  │ ← MUITO OCUPADO
├──────────┬──────────────┬─────────────────────────────────┬─────────────────────┤
│ Sidebar  │ Conv List    │ Conversation Detail             │ CRM Panel           │
│ 52 cols  │ 72 cols      │ Flex                            │ 72 cols             │
│ ──────── │ ──────────── │ ─────────────────────────────── │ ─────────────────── │
│ Canais   │ Tabs(canais) │ Header + 6 Banners + Messages   │ Avatar              │
│ Conversas│ Search       │ + AI Composer                   │ Stats               │
│ Contactos│ Items        │                                 │ Notifications       │
│          │              │                                 │ Settings            │
│          │              │                                 │ Actions             │
│          │              │                                 │ Opportunities       │
│          │              │                                 │ Proposals           │
│          │              │                                 │ Tasks               │
│          │              │                                 │ Activity            │
└──────────┴──────────────┴─────────────────────────────────┴─────────────────────┘
```

## Proposta de Redesign

### 1. Barra Superior Simplificada

**Antes:** 10+ elementos
**Depois:** 4 grupos lógicos

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [📝 Nova]    │   5 abertas • 3 não lidas   │   [🔔 2] [⚡Auto] [↻]   │   [🔍]   │
│   ACÇÃO      │        STATUS               │       FERRAMENTAS       │  SEARCH  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Eliminar Redundância de Filtros

- **Remover** tabs de canais da ConversationList (já existem no Sidebar)
- **Manter** apenas busca + smart filters na lista
- Sidebar fica como único local de filtros de categoria/canal

### 3. Detalhe da Conversa Limpo

**Antes:** 6 banners antes das mensagens
**Depois:** Apenas 1 banner consolidado (só aparece quando relevante)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Avatar] João Silva  •  WhatsApp  •  Aberta  •  🔥Hot           [...] [⚡] [AI] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ⚠️ Follow-up pendente há 2h • Intenção: Vendas • Auto: ✓               [ver +] │ ← BANNER ÚNICO
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                        MENSAGENS (área principal)                               │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Composer]                                                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4. Painel CRM com Tabs

Organizar a informação em 3 tabs simples:

```text
┌─────────────────────────────┐
│  [📋 Info] [💰 Sales] [📜 Hist] │
├─────────────────────────────┤
│  Tab: Info                  │
│  ────────────────────────── │
│  Avatar + Nome              │
│  Email / Telefone           │
│  Status: Active             │
│  Tags: [tag1] [tag2]        │
│  [📧] [📞] [📅]             │
├─────────────────────────────┤
│  Tab: Sales                 │
│  ────────────────────────── │
│  Oportunidades (2)          │
│  Propostas (1)              │
│  Tarefas (3)                │
│  [+ Nova Oportunidade]      │
├─────────────────────────────┤
│  Tab: Histórico             │
│  ────────────────────────── │
│  Timeline de actividade     │
└─────────────────────────────┘
```

## Alterações de Código

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/inbox/InboxMetricsBar.tsx` | Simplificar para 4 grupos: Acção, Status, Ferramentas, Busca |
| `src/components/inbox/ConversationList.tsx` | Remover tabs de canais duplicados, simplificar header |
| `src/components/inbox/ConversationDetail.tsx` | Criar banner consolidado, esconder detalhes em accordions |
| `src/components/inbox/InboxCRMPanel.tsx` | Reorganizar com tabs (Info/Sales/Histórico) |
| `src/components/inbox/InboxView.tsx` | Ajustar layout e responsividade |
| **NOVO** `src/components/inbox/ConversationStatusBanner.tsx` | Banner único consolidando avisos importantes |

### Detalhe das Alterações

#### A. InboxMetricsBar.tsx - Simplificação

```typescript
// Layout simplificado
<div className="flex items-center justify-between px-4 py-2 border-b">
  {/* Acção Principal */}
  <ComposeButton />
  
  {/* Status Compacto */}
  <div className="flex items-center gap-3 text-sm">
    <span className="font-medium">{openCount} abertas</span>
    <span className="text-muted-foreground">•</span>
    <span className={cn(unreadCount > 0 && "text-primary font-medium")}>
      {unreadCount} não lidas
    </span>
  </div>
  
  {/* Ferramentas */}
  <div className="flex items-center gap-2">
    <SmartAlertsPopover />
    <AutopilotToggle compact />
    <SyncButton compact />
  </div>
</div>
```

#### B. ConversationList.tsx - Sem Tabs Duplicados

```typescript
// Remover TabsList de canais (linha 460-476)
// Manter apenas: Header + Search + Smart Filter + Lista
```

#### C. ConversationDetail.tsx - Banner Consolidado

```typescript
// Substituir os 6 banners separados por:
<ConversationStatusBanner
  conversationId={conversationId}
  messages={messages}
  conversation={conversation}
  opportunityTrigger={opportunityTrigger}
/>

// Este componente mostra APENAS alertas importantes:
// - Follow-up pendente (se >2h)
// - Autopilot status (se diferente do padrão)
// - Intenção detectada (se sales)
// - Botão "ver mais" para detalhes
```

#### D. InboxCRMPanel.tsx - Tabs Organizadas

```typescript
// Novo layout com 3 tabs
<Tabs defaultValue="info" className="w-full">
  <TabsList className="w-full grid grid-cols-3 h-9">
    <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
    <TabsTrigger value="sales" className="text-xs">Vendas</TabsTrigger>
    <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
  </TabsList>
  
  <TabsContent value="info">
    {/* Avatar, contacto, status, tags */}
  </TabsContent>
  
  <TabsContent value="sales">
    {/* Oportunidades, propostas, tarefas */}
  </TabsContent>
  
  <TabsContent value="history">
    {/* UnifiedActivityLog */}
  </TabsContent>
</Tabs>
```

## Benefícios Esperados

1. **Menos ruído visual** - Informação agrupada logicamente
2. **Acções claras** - Botão "Nova Mensagem" em destaque
3. **Foco no conteúdo** - Mensagens visíveis sem scroll
4. **Navegação intuitiva** - Filtros num só local (Sidebar)
5. **CRM organizado** - Tabs separam info/vendas/histórico

## Prioridade de Implementação

1. **Alta**: Simplificar InboxMetricsBar
2. **Alta**: Remover tabs duplicados da ConversationList
3. **Média**: Criar banner consolidado
4. **Média**: Reorganizar CRM Panel com tabs
5. **Baixa**: Ajustes de responsividade

