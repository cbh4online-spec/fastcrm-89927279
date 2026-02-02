

# Plano: Ajustes no Documento PDF da Proposta

## Problemas Identificados

### 1. Página 5 (Proposta e Condições) - OK
A secção de "Condições de Venda" já está em formato de tabela horizontal e inclui:
- Pagamento: Transferência Bancária
- Condições: 50% com a adjudicação (sinal) e 50% após a conclusão da instalação e testes
- Imposto: IVA 23% (incluído nos valores apresentados)
- Entrega: A combinar com o cliente
- Validade: 15 dias (até 05 de fevereiro de 2026)

**Esta secção está bem formatada!**

### 2. Página 6 - Página Extra Indesejada
O problema principal: existe uma **página 6 quase vazia** que contém apenas:
- Um fragmento de fundo cinzento
- "Data: ___/___/______"

Isto acontece porque a secção de assinatura está a ser cortada no algoritmo de fatiamento do PDF, criando uma página extra desnecessária.

### 3. Falta o IBAN na Tabela de Condições
Na página 5, a tabela de Condições de Venda não mostra o IBAN. Isto pode significar que:
- O workspace não tem IBAN configurado
- Ou há um problema na renderização

## Solução Proposta

### Problema Principal: Página 6 Extra

O algoritmo de geração de PDF em `ProposalDocumentPreviewDialog.tsx` está a fatiar a secção "proposal" em múltiplas páginas, e a última fatia (área de assinatura) cria uma página quase vazia.

**Solução:** Garantir que a área de assinatura fique sempre na mesma página que as condições de venda, ajustando a altura da secção para que caiba numa única página ou melhorando o algoritmo de fatiamento.

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalClientDocument.tsx` | Compactar área de assinatura para evitar quebra de página |
| `src/components/proposals/ProposalDocumentPreviewDialog.tsx` | Ajustar algoritmo de fatiamento para não criar páginas quase vazias |

## Implementação

### Alteração 1: Compactar Área de Assinatura

Reduzir o espaço vertical na secção de assinatura para evitar que ultrapasse a margem da página:

```typescript
{/* Signature - mais compacto */}
<div className="mt-6 pt-4 border-t border-gray-200">
  <div className="flex flex-col md:flex-row md:justify-between gap-4">
    {/* Client Signature */}
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
        Aceite do Cliente
      </p>
      <div className="w-40 h-12 border-b-2 border-gray-300 mb-1"></div>
      <p className="text-xs text-gray-600">Data: ___/___/______</p>
    </div>

    {/* Company Signature */}
    <div className="text-right">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
        Assinatura
      </p>
      <div className="inline-block text-left">
        <div className="w-40 h-12 border-b-2 border-gray-300 mb-1"></div>
        {signatureName && (
          <p className="font-medium text-gray-900 text-sm">{signatureName}</p>
        )}
        {signatureTitle && (
          <p className="text-xs text-gray-500">{signatureTitle}</p>
        )}
      </div>
    </div>
  </div>
</div>
```

### Alteração 2: Evitar Páginas com Pouco Conteúdo

No algoritmo de fatiamento do PDF, adicionar lógica para não criar uma página se a fatia restante for muito pequena (menos de 80px de conteúdo real):

```typescript
// Ao fatiar secções grandes, verificar se a fatia final é muito pequena
const remainingHeight = heightMM - sliceStartMM;
const MIN_SLICE_HEIGHT_MM = 30; // ~80px, evitar páginas quase vazias

// Se o restante for menor que o mínimo, incluir na página anterior
if (remainingHeight < MIN_SLICE_HEIGHT_MM && sliceStartMM > 0) {
  // Não criar nova página, terminar aqui
  break;
}
```

## Resultado Esperado

1. **5 páginas apenas** (em vez de 6)
2. A área de assinatura ficará na mesma página que as condições de venda
3. Sem páginas quase vazias no final do documento

## Complexidade

Baixa - Ajustes de espaçamento CSS e refinamento do algoritmo de fatiamento

