
# Plano: Corrigir Scroll do Painel de Sugestões AI

## Problema Identificado
O painel lateral direito (AI Assistant Panel) não permite scroll porque:

1. O container exterior (linha 508) tem `overflow-y-auto` mas falta `min-h-0` - essencial para flex containers
2. O `EnhancedAIReplyPanel` usa `ScrollArea` com `h-full` mas está dentro de uma div sem altura definida
3. Conflito entre múltiplos mecanismos de scroll aninhados

## Solução

### Ficheiro: `src/components/inbox/ConversationDetail.tsx`

**Alteração 1** - Linha 508:
Adicionar `min-h-0` ao container do AI Assistant Panel para garantir que o flex layout permite scroll:

```text
ANTES:
  <div className="w-80 border-l border-border bg-muted/20 hidden lg:block overflow-y-auto">

DEPOIS:
  <div className="w-80 border-l border-border bg-muted/20 hidden lg:block overflow-y-auto min-h-0">
```

### Ficheiro: `src/components/inbox/EnhancedAIReplyPanel.tsx`

**Alteração 2** - Linha 164:
Remover o `ScrollArea` exterior que conflitua com o scroll do container pai. O scroll já é gerido pelo painel pai.

```text
ANTES:
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        ...
      </div>
    </ScrollArea>
  );

DEPOIS:
  return (
    <div className="space-y-3">
      ...
    </div>
  );
```

## Detalhes Técnicos

### Porquê o `min-h-0`?
Em layouts flex, elementos filhos com `overflow-auto` ou `overflow-hidden` precisam de `min-h-0` para que o overflow funcione. Sem isto, o browser tenta expandir o elemento para mostrar todo o conteúdo.

### Hierarquia de Scroll
```text
InboxView (h-[calc(100vh-8rem)])
  └─ Messages Area (flex-1 overflow-hidden min-h-0) ✅ Já corrigido
       └─ Chat Messages (flex-1 min-h-0 overflow-hidden) ✅ Já corrigido
       └─ AI Panel (w-80 overflow-y-auto) ← Falta min-h-0
            └─ Inner content com vários componentes
                 └─ EnhancedAIReplyPanel ← ScrollArea desnecessário
```

## Impacto
- Painel AI lateral passa a fazer scroll correctamente
- Remove conflito de scroll aninhado
- Mantém compatibilidade com todos os componentes existentes
