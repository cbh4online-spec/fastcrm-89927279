
## Corrigir Download de Todas as Conversas Instagram do GHL

### Problema

A sincronizacao do GHL so esta a descarregar 4 conversas de um total muito maior. Existem **dois bugs** na chamada a API do GHL:

### Bug 1: Falta o filtro `status=all`

A API do GHL `/conversations/search` aceita um parametro `status` com valores: `all`, `read`, `unread`, `starred`, `recents`. O codigo atual nao passa este parametro, o que faz a API devolver apenas conversas recentes/nao lidas por defeito. Adicionando `status=all` vai retornar todas as conversas.

### Bug 2: Paginacao incorreta

O codigo usa `startAfterId` como parametro de paginacao, mas a documentacao oficial da API indica que o parametro correto e `startAfterDate` -- que deve conter o valor de sort do ultimo documento (um timestamp), nao um ID. Isto faz com que a paginacao nunca funcione, mesmo que existam mais de 50 conversas.

### Solucao

Modificar a edge function `ghl-sync-conversations/index.ts` para:

1. Adicionar `status: "all"` aos query parameters da pesquisa
2. Corrigir a paginacao de `startAfterId` para `startAfterDate`, usando o timestamp da ultima conversa da pagina
3. Adicionar log do total de conversas retornadas por pagina para diagnostico

### Detalhes Tecnicos

**Ficheiro**: `supabase/functions/ghl-sync-conversations/index.ts`

Alteracoes no bloco de query parameters (linhas 363-370):

```text
// Antes:
const queryParams = new URLSearchParams({
  locationId,
  limit: "50",
});
if (lastId) {
  queryParams.set("startAfterId", lastId);
}

// Depois:
const queryParams = new URLSearchParams({
  locationId,
  limit: "50",
  status: "all",
});
if (lastSortDate) {
  queryParams.set("startAfterDate", lastSortDate);
}
```

Alteracoes na variavel de paginacao (linha 353):

```text
// Antes:
let lastId: string | undefined;

// Depois:
let lastSortDate: string | undefined;
```

Alteracoes no bloco de paginacao no final do loop (linhas 596-599):

```text
// Antes:
if (conversations.length > 0) {
  lastId = conversations[conversations.length - 1].id;
}

// Depois:
if (conversations.length > 0) {
  const lastConv = conversations[conversations.length - 1];
  // Use lastMessageDate or dateUpdated as sort cursor
  lastSortDate = lastConv.lastMessageDate || lastConv.dateUpdated || lastConv.id;
}
```

Adicionar log apos receber resposta:

```text
console.log(`[GHL Sync] Page ${pageCount}: got ${conversations.length} conversations`);
```

### Resultado Esperado

- Todas as conversas do GHL (nao apenas as recentes) serao descarregadas
- A paginacao funcionara corretamente para contas com mais de 50 conversas
- Leads serao criados automaticamente para contactos novos (logica ja implementada)
- As mensagens Instagram, WhatsApp, e de outros canais serao todas sincronizadas
