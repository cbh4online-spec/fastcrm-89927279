
# Plano: Corrigir Filtros "Novas" e "Todas" na Inbox

## Problema Identificado

Quando clicas nos filtros "Novas" ou "Todas" na barra lateral da inbox, a lista de conversas não muda. Isto acontece porque:

1. O estado interno do componente `ConversationList` é inicializado apenas uma vez quando o componente carrega
2. Quando mudas de categoria na barra lateral, o valor novo não é aplicado - a lista continua a mostrar os mesmos dados
3. A categoria "new" (Novas) deveria filtrar apenas conversas com mensagens não lidas, mas esse filtro não está implementado

## Solução

Vou adicionar sincronização entre a categoria selecionada na barra lateral e os filtros internos da lista de conversas:

### Alterações em `ConversationList.tsx`:

1. **Adicionar useEffect para sincronizar `statusFilter`** com mudanças em `defaultStatus`
2. **Adicionar lógica de filtro para a categoria "new"** - mostrar apenas conversas com `unread_count > 0`
3. **Aplicar o filtro `selectedCategory`** na lógica de processamento das conversas

### Comportamento Esperado Após a Correção:

| Categoria | Resultado |
|-----------|-----------|
| **Novas** | Conversas abertas com mensagens não lidas (`unread_count > 0`) |
| **Todas** | Todas as conversas abertas |
| **Atribuídas** | Conversas atribuídas a alguém |
| **Favoritas** | Conversas marcadas como favoritas |
| **Negociações** | Conversas com intenção de "sales" |
| **Fechadas** | Conversas com status "closed" |
| **Arquivadas** | Conversas com status "archived" |

---

## Secção Técnica

### Ficheiros a Modificar

**`src/components/inbox/ConversationList.tsx`**

Adicionar `useEffect` para sincronizar estado quando props mudam:

```typescript
// Sync statusFilter with defaultStatus prop changes
useEffect(() => {
  if (defaultStatus) {
    setStatusFilter(defaultStatus);
  }
}, [defaultStatus]);
```

Adicionar filtro para a categoria "new" no `processedConversations`:

```typescript
// Inside useMemo filter logic
let filtered = conversations.filter((conv) => {
  // Category-based filtering
  if (selectedCategory === "new") {
    if (conv.unread_count === 0) return false;
  }
  if (selectedCategory === "assigned") {
    if (!conv.assigned_to) return false;
  }
  if (selectedCategory === "negotiations") {
    const intent = conv.user_intent || conv.ai_intent;
    if (intent !== "sales") return false;
  }
  // ... rest of filters
});
```

Actualizar dependências do `useMemo`:

```typescript
}, [conversations, search, smartFilter, selectedCategory]);
```

### Fluxo de Dados Corrigido

```text
InboxSidebar                    InboxView                    ConversationList
     │                              │                              │
     │  onCategoryChange("new")     │                              │
     ├─────────────────────────────>│                              │
     │                              │  selectedCategory="new"      │
     │                              │  defaultStatus="open"        │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │                    useEffect triggers
     │                              │                    setStatusFilter("open")
     │                              │                              │
     │                              │                    useMemo re-runs with
     │                              │                    selectedCategory="new"
     │                              │                    filters unread > 0
     │                              │                              │
     │                              │                    UI updates ✓
```
