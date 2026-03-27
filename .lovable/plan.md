

## Fix: Alinhamento e visibilidade dos dados no painel de detalhes

**Problema**: Os campos (email, fonte, website, etc.) usam layout horizontal com `truncate`, cortando valores longos. O label ocupa `min-w-[80px]` e o valor fica à direita com `text-right truncate`, tornando impossível ver a informação completa.

**Solução**: Mudar o layout dos campos de horizontal para **vertical (stacked)** — label em cima, valor em baixo — eliminando o truncamento e garantindo que toda a informação é visível.

### Alterações em `EntityDetailsPanel.tsx`

1. **EditableFieldRow** — Mudar de `flex items-start` (lado a lado) para layout empilhado:
   - Linha 1: ícone + label (lado a lado, tamanho pequeno)
   - Linha 2: valor completo (sem truncate, com word-break)
   - Remover `min-w-[80px]` do label e `text-right truncate` do valor

2. **ReadOnlyFieldRow** — Aplicar a mesma mudança de layout empilhado

3. **Valores de link** (email, website, phone) — Remover `truncate` para mostrar o texto completo, com `break-all` para URLs longas

**Resultado**: Cada campo ocupa mais espaço vertical mas mostra toda a informação sem cortes. O painel lateral mantém a mesma largura (w-80).

