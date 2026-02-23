
# Corrigir menu cortado e sincronizar mensagens com lead/contacto

## Problema 1: Menu lateral da lead cortado

Na pagina de detalhe da lead, o menu lateral esquerdo (EntitySidebarMenu) tem as secoes parcialmente cortadas. As labels das secoes como "CONTEXTO", "ATIVIDADE", "NEGOCIO", "DADOS" aparecem truncadas. O problema esta no layout pai que usa `flex overflow-hidden` (linha 450 de LeadDetailWithSidebar.tsx), combinado com a falta de uma altura explicita no container da ScrollArea do menu.

### Solucao

No ficheiro `src/components/crm/LeadDetailWithSidebar.tsx`, o container principal (linha 325) usa `-m-6` para compensar padding do layout pai, mas o `flex-1 flex overflow-hidden` (linha 450) pode nao estar a calcular a altura corretamente. Ajustar para garantir que o menu lateral tem `h-full` e `overflow-y-auto` adequados.

No `EntitySidebarMenu.tsx`, a ScrollArea precisa de uma altura explicita ou `h-full` no container pai para funcionar corretamente dentro do flex layout.

## Problema 2: Mensagens nao sincronizadas com a lead

O "Historico Recente" no `ContactMessagesSection` e apenas um placeholder estatico (linhas 833-847) que mostra sempre "Nenhuma mensagem recente". Nunca faz query a base de dados para buscar conversas/mensagens associadas a lead.

A tabela `conversations` tem um campo `lead_id` que liga conversas a leads. Precisamos de:

1. Fazer query as conversas onde `lead_id = entityId` (ou `contact_id` para contactos)
2. Mostrar as mensagens reais no "Historico Recente"
3. Permitir que o utilizador abra/continue a conversa existente

### Solucao

Substituir o placeholder por uma query real que busca conversas e mensagens recentes associadas a entidade.

## Detalhes tecnicos

### Ficheiro: `src/components/crm/LeadDetailWithSidebar.tsx`

- Linha 325: garantir que o container principal calcula altura corretamente
- Linha 450: ajustar `overflow-hidden` para que o menu nao fique cortado

Alterar:
```
<div className="h-full flex flex-col -m-6">
```
Para:
```
<div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 64px)' }}>
```

Isto garante que o layout tem uma altura fixa baseada no viewport menos o topbar.

### Ficheiro: `src/components/entity/EntitySidebarMenu.tsx`

- Adicionar `h-full` ao container da ScrollArea para garantir scroll correto dentro do flex

### Ficheiro: `src/components/messages/ContactMessagesSection.tsx`

Substituir o bloco "Historico Recente" (linhas 833-847) por um componente que:

1. Faz query `conversations` onde `lead_id = entityId` (se entityType === 'lead') ou `contact_id = entityId` (se entityType === 'contact')
2. Para cada conversa encontrada, busca as ultimas 3-5 mensagens
3. Mostra uma lista com:
   - Canal da conversa (icone)
   - Preview da ultima mensagem
   - Data relativa
   - Botao para abrir a conversa na Inbox

Query necessaria:
```typescript
const { data: linkedConversations } = useQuery({
  queryKey: ['entity-conversations', entityType, entityId],
  queryFn: async () => {
    const column = entityType === 'lead' ? 'lead_id' 
                 : entityType === 'contact' ? 'contact_id' 
                 : 'company_id';
    
    const { data } = await supabase
      .from('conversations')
      .select('id, channel, last_message_preview, last_message_at, last_message_direction, status')
      .eq(column, entityId)
      .order('last_message_at', { ascending: false })
      .limit(5);
    
    return data;
  },
  enabled: !!entityId,
});
```

A secao mostrara:
- Lista de conversas associadas com canal, preview e data
- Link para abrir cada conversa na Inbox (`/dashboard/inbox?conversation=ID`)
- Estado vazio so quando realmente nao existem conversas

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/components/crm/LeadDetailWithSidebar.tsx` | Corrigir altura do layout para evitar corte do menu |
| `src/components/entity/EntitySidebarMenu.tsx` | Garantir scroll correto com altura explicita |
| `src/components/messages/ContactMessagesSection.tsx` | Substituir placeholder por query real de conversas associadas |

## Resultado esperado

- Menu lateral completamente visivel sem cortes, com scroll funcional
- "Historico Recente" mostra conversas reais associadas a lead/contacto
- Utilizador consegue ver e aceder as conversas existentes diretamente da ficha da lead
