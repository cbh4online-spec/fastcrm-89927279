

# Plano: Separar Condições de Venda em Página Própria

## Situação Actual

A secção `data-pdf-section="proposal"` contém:
1. Tabela de itens da proposta
2. Totais (Subtotal, IVA, Total)
3. Condições de Venda (tabela com Pagamento, IBAN, Condições, Imposto, Entrega, Validade)
4. Observações
5. Área de assinatura

Tudo isto está num único bloco, o que significa que as condições de venda podem aparecer na mesma página que a tabela de itens.

## Solução

Criar uma nova secção `data-pdf-section="conditions"` que contém as Condições de Venda, observações e área de assinatura. O algoritmo de PDF já reconhece secções separadas e pode forçar quebras de página.

## Estrutura Pretendida

```text
┌─────────────────────────────────────────┐
│ Secção "proposal"                       │
│   - Título: "Proposta"                  │
│   - Tabela de itens                     │
│   - Totais (Subtotal, IVA, Total)       │
└─────────────────────────────────────────┘
            ↓ Quebra de página ↓
┌─────────────────────────────────────────┐
│ Secção "conditions"                     │
│   - Título: "Condições de Venda"        │
│   - Tabela de condições                 │
│   - Observações                         │
│   - Área de assinatura                  │
└─────────────────────────────────────────┘
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalClientDocument.tsx` | Separar "Condições de Venda" numa nova `div` com `data-pdf-section="conditions"` |
| `src/components/proposals/ProposalDocumentPreviewDialog.tsx` | Adicionar `conditions` à lista de secções que forçam nova página |

## Implementação

### Alteração 1: Dividir Secção no ProposalClientDocument.tsx

Fechar a secção "proposal" após os totais e abrir uma nova secção "conditions":

```typescript
{/* ====== 5. PROPOSTA ====== */}
<div data-pdf-section="proposal" className="border-t">
  {/* Section Header */}
  <div className="px-4 md:px-8 pt-8 pb-4">
    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
      Proposta
    </h2>
  </div>

  {/* Items Table */}
  {/* ... tabela de itens ... */}

  {/* Totals */}
  {/* ... subtotal, IVA, total ... */}
</div>

{/* ====== 6. CONDIÇÕES DE VENDA ====== */}
<div data-pdf-section="conditions" className="border-t">
  {/* Section Header */}
  <div className="px-4 md:px-8 pt-8 pb-4">
    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
      Condições de Venda
    </h2>
  </div>
  
  {/* Conditions table, notes, signature */}
  <div className="bg-gray-50 px-4 md:px-8 py-6">
    {/* Tabela de condições */}
    {/* Observações */}
    {/* Área de assinatura */}
  </div>
</div>
```

### Alteração 2: Forçar Nova Página no PDF

No `ProposalDocumentPreviewDialog.tsx`, adicionar `conditions` à lista de secções que forçam nova página:

```typescript
sectionData.push({ 
  canvas, 
  heightMM, 
  name: sectionName,
  // Capa e condições sempre em página separada
  forceNewPage: sectionName === 'cover' || sectionName === 'conditions'
});
```

## Resultado Esperado

| Página | Conteúdo |
|--------|----------|
| 1 | Capa |
| 2-3 | Âmbito do Projecto |
| 3-4 | Cronograma |
| 4 | Referências |
| 5 | Proposta (tabela de itens + totais) |
| **6** | **Condições de Venda + Assinatura** (página separada) |

## Complexidade

Baixa - Apenas reorganização de elementos HTML e ajuste no algoritmo de PDF

