

# Sugestoes Automaticas de Cross-sell e Up-sell na Criacao com IA

## Contexto
O sistema ja possui um modo `suggest-relations` na edge function `ai-product-assistant` que analisa o catalogo e cria relacoes do tipo `compatible`, `related` e `bundle` na tabela `product_relations`. Atualmente, este modo so e acionado manualmente no separador de relacoes (`ProductRelationsTab`). O objetivo e disparar automaticamente este processo quando um produto e criado (via formulario normal ou futuro wizard IA), apresentando os resultados ao utilizador.

## Plano

### 1. Hook dedicado para sugestoes pos-criacao
Criar `src/hooks/usePostCreationSuggestions.ts` que:
- Recebe o ID do produto recem-criado e o workspace ID
- Chama automaticamente o modo `suggest-relations` da edge function
- Devolve os resultados (quantas relacoes foram adicionadas)
- Gere estados de loading e erro

### 2. Componente de notificacao/card de sugestoes
Criar `src/components/products/PostCreationSuggestionsCard.tsx`:
- Aparece como um card/banner apos a criacao bem-sucedida de um produto
- Mostra estado de loading enquanto a IA analisa o catalogo
- Exibe as relacoes encontradas agrupadas por tipo (Compatible, Related, Bundle)
- Botoes para ver o produto e ir ao separador de relacoes
- Opcao para descartar

### 3. Integracao no fluxo de criacao
Modificar `src/components/products/CreateProductDialog.tsx`:
- No `onSuccess` do `createProduct`, guardar o produto criado em estado local
- Mostrar o `PostCreationSuggestionsCard` antes de fechar o dialogo
- O dialogo so fecha quando o utilizador confirma ou descarta as sugestoes

### 4. Melhorias na edge function
Editar `supabase/functions/ai-product-assistant/index.ts` no modo `suggest-relations`:
- Adicionar ao prompt instrucoes para classificar sugestoes como cross-sell (compatible/bundle) ou up-sell (related com preco superior)
- Incluir um campo `relationship_label` amigavel (ex: "Acessorio recomendado", "Alternativa premium")
- Devolver as sugestoes inseridas no response para o frontend mostrar detalhes

## Detalhes Tecnicos

### Hook `usePostCreationSuggestions`
```text
Input:  { productId: string, workspaceId: string }
Output: { suggestions: RelationSuggestion[], added: number, isLoading, error }
```
Chama `supabase.functions.invoke("ai-product-assistant", { body: { mode: "suggest-relations", productId, workspaceId } })` e devolve os dados enriquecidos.

### Resposta melhorada do `suggest-relations`
```text
{
  success: true,
  data: {
    added: 5,
    relations: [
      { targetId, targetName, type: "compatible", reason: "Cabo compativel", label: "Acessorio" },
      { targetId, targetName, type: "related", reason: "Versao superior", label: "Upgrade" },
      { targetId, targetName, type: "bundle", reason: "Kit frequente", label: "Compre junto" }
    ]
  }
}
```
Para devolver `targetName`, o edge function ja tem acesso aos `otherProducts` com campo `name` - basta incluir no response.

### Ficheiros a criar/editar
- **Criar**: `src/hooks/usePostCreationSuggestions.ts`
- **Criar**: `src/components/products/PostCreationSuggestionsCard.tsx`
- **Editar**: `src/components/products/CreateProductDialog.tsx` (mostrar card pos-criacao)
- **Editar**: `supabase/functions/ai-product-assistant/index.ts` (enriquecer response do suggest-relations)
- **Editar**: `src/hooks/useProductAIAssistant.ts` (adicionar metodo `suggestRelations`)

