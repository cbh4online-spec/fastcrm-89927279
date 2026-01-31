
# Plano de Implementação - Módulo de Notas de Encomenda (MVP Final)

## Resumo Executivo

A auditoria revelou que o módulo está **95% completo**. As funcionalidades restantes focam-se em:

1. **Repetir Encomenda no Backoffice** - Integrar o botão na página de detalhe para admins
2. **Informação Técnica Completa no Modal** - Garantir que os campos estão a ser lidos corretamente da BD
3. **Integração do Repetir Encomenda na Vista do Cliente** - Adicionar na página de detalhe individual

---

## Bloco 1: Repetir Encomenda no Backoffice

### Objetivo
Permitir que o backoffice crie uma nova encomenda idêntica a uma existente, abrindo o detalhe do cliente com os produtos pré-carregados.

### Ficheiros a modificar

**`src/components/order-notes/OrderNoteDetail.tsx`**
- Adicionar botão "Criar Nova Encomenda para Cliente"
- Redirecionar para o portal do cliente com produtos no carrinho (via sessionStorage ou context)
- Alternativa: Criar encomenda duplicada em draft diretamente

### Implementação
- Adicionar botão no header junto ao PDF
- Criar função que duplica a encomenda (novo draft com mesmos itens)
- Toast de sucesso com link para a nova encomenda

---

## Bloco 2: Repetir Encomenda na Página de Detalhe do Cliente

### Objetivo
O cliente pode repetir uma encomenda passada diretamente da página de detalhe individual.

### Ficheiros a modificar

**`src/pages/client/ClientOrderDetailPage.tsx`**
- Importar e usar o componente `RepeatOrderButton`
- Adicionar na secção de ações (junto ao header ou no sidebar)

### Implementação
- O componente já existe em `src/components/client-portal/RepeatOrderButton.tsx`
- Apenas necessita de ser integrado na página de detalhe

---

## Bloco 3: Validação e Melhoria do Modal de Produto

### Objetivo
Garantir que todos os campos técnicos (composição, modo de uso, resultados esperados) são corretamente exibidos quando existem.

### Situação Atual
O componente `ProductTechnicalInfo.tsx` já suporta:
- `composition` (string ou array)
- `active_ingredients` (array)
- `usage` (string)
- `expected_results` (string)
- `duration` (string)
- `contraindications` (string)
- `storage` (string)

### Problema Identificado
Os dados de `specifications` na BD variam em estrutura. Exemplo encontrado:
```json
{
  "brand": "Ajax Systems",
  "sensor": "...",
  "resolution": "..."
}
```
Mas faltam os campos clínicos (`composition`, `usage`, `expected_results`).

### Solução
O código já está preparado. O problema está nos dados. Não há alteração de código necessária - apenas garantir que os produtos inseridos usam os campos corretos no JSON `specifications`.

---

## Bloco 4: Favoritos (Opcional - V1)

### Situação
Não está implementado mas não é MVP obrigatório segundo o documento.

### Recomendação
Adiar para V1 conforme roadmap.

---

## Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/order-notes/OrderNoteDetail.tsx` | Adicionar botão "Repetir Encomenda" para backoffice |
| `src/pages/client/ClientOrderDetailPage.tsx` | Integrar `RepeatOrderButton` existente |

---

## Detalhes Técnicos

### Alteração 1: OrderNoteDetail.tsx (Backoffice)

Adicionar no header (junto ao botão PDF):

```typescript
import { RefreshCw } from "lucide-react";
// ... existing code

// New function to duplicate order
const handleDuplicateOrder = async () => {
  // Create new draft order with same items
  // Redirect to the new order detail page
};

// In JSX, add button:
<Button variant="outline" onClick={handleDuplicateOrder}>
  <RefreshCw className="h-4 w-4 mr-2" />
  Duplicar Encomenda
</Button>
```

### Alteração 2: ClientOrderDetailPage.tsx (Cliente)

Adicionar no header após o título:

```typescript
import { RepeatOrderButton } from "@/components/client-portal/RepeatOrderButton";

// In JSX, after the header div:
<RepeatOrderButton order={order} variant="button" />
```

---

## Validação Final (Checklist)

Após implementação, verificar:

- [ ] Cliente consegue repetir encomenda a partir do histórico (OrderCard) - **JÁ FUNCIONA**
- [ ] Cliente consegue repetir encomenda a partir do detalhe - **A IMPLEMENTAR**
- [ ] Admin consegue duplicar encomenda no backoffice - **A IMPLEMENTAR**
- [ ] Modal de produto mostra informação técnica quando disponível - **JÁ FUNCIONA**
- [ ] Email é enviado automaticamente ao submeter - **JÁ FUNCIONA**
- [ ] Checkout permite solicitar prestações - **JÁ FUNCIONA**
- [ ] Histórico mostra todos os estados - **JÁ FUNCIONA**

---

## Tempo Estimado

- Bloco 1 (Backoffice duplicate): ~15 minutos
- Bloco 2 (Cliente detail repeat): ~5 minutos
- **Total**: ~20 minutos
