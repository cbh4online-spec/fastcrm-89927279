
# Plano: Corrigir Scroll no Painel de Sugestões AI

## Problema Identificado

Analisando a screenshot, o texto da sugestão AI ("The conversation appears to be a series of tests and automated welcome messages...") está a ser cortado e o utilizador não consegue ver o resto do conteúdo abaixo.

### Causas Raiz

1. **Estrutura flex incompleta** - O painel AI (`linha 508`) tem `overflow-y-auto min-h-0` mas precisa de `flex flex-col` para que o scroll funcione correctamente com o conteúdo empilhado
2. **Preview sem controlo de altura** - O texto do preview (linha 457-460) pode crescer indefinidamente sem mecanismo de scroll
3. **Container interno sem restrições** - A `div` interior com `p-3 space-y-4` não tem restrições de altura

## Solução

### Ficheiro: `src/components/inbox/ConversationDetail.tsx`

**Alteração 1** - Linha 508:
Adicionar `flex flex-col` ao container do painel AI para estruturar correctamente o layout:

```text
ANTES:
<div className="w-80 border-l border-border bg-muted/20 hidden lg:block overflow-y-auto min-h-0">
  <div className="p-3 space-y-4">

DEPOIS:
<div className="w-80 border-l border-border bg-muted/20 hidden lg:flex flex-col min-h-0">
  <div className="flex-1 overflow-y-auto p-3 space-y-4">
```

### Ficheiro: `src/components/inbox/EnhancedAIReplyPanel.tsx`

**Alteração 2** - Linha 457-460:
Limitar altura máxima do preview e adicionar scroll interno:

```text
ANTES:
{displayReply && (
  <div className="p-2 bg-background rounded-lg border">
    <p className="text-xs whitespace-pre-wrap">{displayReply}</p>
  </div>
)}

DEPOIS:
{displayReply && (
  <div className="p-2 bg-background rounded-lg border max-h-40 overflow-y-auto">
    <p className="text-xs whitespace-pre-wrap">{displayReply}</p>
  </div>
)}
```

**Alteração 3** - Linha 364-366:
Aplicar a mesma lógica ao template draft:

```text
ANTES:
<div className="p-2 bg-muted/50 rounded-lg border text-xs whitespace-pre-wrap">
  {templateDraft}
</div>

DEPOIS:
<div className="p-2 bg-muted/50 rounded-lg border text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
  {templateDraft}
</div>
```

## Detalhes Técnicos

### Hierarquia de Scroll Corrigida
```text
ConversationDetail (h-full flex flex-col)
  └─ Messages Area (flex-1 flex overflow-hidden min-h-0)
       ├─ Chat Messages (flex-1 flex-col min-h-0)
       │    └─ ScrollArea (flex-1 p-4) ← Scroll das mensagens
       │    └─ AIMessageComposer (bottom fixed)
       │
       └─ AI Panel (w-80 flex flex-col min-h-0) ← CORRIGIDO
            └─ Inner Content (flex-1 overflow-y-auto p-3 space-y-4) ← SCROLL AQUI
                 ├─ AIActionSuggestions
                 ├─ ConversationClassification
                 ├─ EnhancedAIReplyPanel
                 │    └─ Preview (max-h-40 overflow-y-auto) ← SCROLL INTERNO
                 └─ UnifiedActivityLog
```

### Porquê estas alterações?

1. **`flex flex-col`** no container exterior permite que o filho com `flex-1 overflow-y-auto` ocupe o espaço restante e faça scroll
2. **`max-h-40 overflow-y-auto`** nos previews de texto previne que textos longos quebrem o layout e permite scroll localizado
3. **`hidden lg:flex`** substitui `hidden lg:block` para activar o comportamento flex

## Impacto
- Painel AI lateral permite scroll de todo o conteúdo
- Previews de texto longo têm scroll interno controlado
- Todos os componentes dentro do painel ficam acessíveis
- Compatibilidade com o layout responsivo mantida
