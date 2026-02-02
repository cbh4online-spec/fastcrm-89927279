

# Plano: Melhorar Secção de Condições de Venda

## Problemas Identificados

1. **Layout em lista vertical** - As condições de pagamento estão apresentadas como bullets verticais (`• Transferência Bancária`, `• Condições: ...`) quando deveriam fluir horizontalmente numa tabela ou formato de "ficha técnica"

2. **Falta informação de imposto (IVA)** - Apesar de calcular o IVA nos totais, não há menção explícita da taxa de imposto na secção de condições

3. **Falta informação de entrega** - O sistema tem tabela `delivery_modes` (Online, Presencial, Híbrido, etc.) mas esta informação não aparece nas condições

## Estrutura Actual vs Pretendida

| Actual | Pretendido |
|--------|------------|
| `• Transferência Bancária` | **Pagamento:** Transferência Bancária • IBAN: PT50... |
| `IBAN: PT50...` em linha separada | **Condições:** 50% com adjudicação e 50% na entrega |
| `• Condições: 50_adju...` | **Imposto:** IVA 23% incluído nos valores |
| Nada sobre entrega | **Entrega:** A definir / Online / Presencial |

## Novo Layout: Tabela de Condições

```
┌─────────────────────────────────────────────────────────────────┐
│ CONDIÇÕES DE VENDA                                               │
├──────────────┬──────────────────────────────────────────────────┤
│ Pagamento    │ Transferência Bancária                           │
├──────────────┼──────────────────────────────────────────────────┤
│ IBAN         │ PT50 XXXX XXXX XXXX XXXX XXXX X                  │
├──────────────┼──────────────────────────────────────────────────┤
│ Condições    │ 50% com adjudicação e 50% na entrega             │
├──────────────┼──────────────────────────────────────────────────┤
│ Imposto      │ IVA 23% (incluído nos valores apresentados)      │
├──────────────┼──────────────────────────────────────────────────┤
│ Entrega      │ Presencial / A combinar com o cliente            │
├──────────────┼──────────────────────────────────────────────────┤
│ Validade     │ 30 dias (até 02 de Março de 2026)                │
└──────────────┴──────────────────────────────────────────────────┘
```

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalClientDocument.tsx` | Substituir lista por tabela horizontal de condições |

## Implementação

### Novo Código para Secção de Condições

```typescript
{/* Conditions of Sale - Table Format */}
<div className="bg-gray-50 px-4 md:px-8 py-6 mt-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wide">
    Condições de Venda
  </h3>
  
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <table className="w-full text-sm">
      <tbody>
        {/* Payment Method */}
        <tr className="border-b border-gray-100">
          <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
            Pagamento
          </td>
          <td className="px-4 py-3 text-gray-600">
            Transferência Bancária
          </td>
        </tr>
        
        {/* IBAN */}
        {companyIban && (
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
              IBAN
            </td>
            <td className="px-4 py-3 text-gray-600 font-mono text-xs">
              {companyIban}
            </td>
          </tr>
        )}
        
        {/* Payment Conditions */}
        {paymentLabel && (
          <tr className="border-b border-gray-100">
            <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
              Condições
            </td>
            <td className="px-4 py-3 text-gray-600">
              {paymentLabel}
            </td>
          </tr>
        )}
        
        {/* Tax Info */}
        <tr className="border-b border-gray-100">
          <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
            Imposto
          </td>
          <td className="px-4 py-3 text-gray-600">
            IVA 23% (incluído nos valores apresentados)
          </td>
        </tr>
        
        {/* Delivery Info */}
        <tr className="border-b border-gray-100">
          <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
            Entrega
          </td>
          <td className="px-4 py-3 text-gray-600">
            A combinar com o cliente
          </td>
        </tr>
        
        {/* Validity */}
        {expiryDate && (
          <tr>
            <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
              Validade
            </td>
            <td className="px-4 py-3 text-gray-600">
              {proposal.validity_days} dias (até {format(expiryDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })})
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
  
  {/* Notes - separate if exists */}
  {proposal.notes && (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Observações</p>
      <p className="text-sm text-gray-600">{proposal.notes}</p>
    </div>
  )}
  
  {/* Signature area remains the same */}
</div>
```

## Resultado Esperado

A secção de Condições de Venda aparecerá como uma tabela limpa e profissional com:

- **Pagamento**: Método de pagamento
- **IBAN**: Dados bancários (se configurado)
- **Condições**: Prazo/modalidade de pagamento formatado correctamente
- **Imposto**: Taxa de IVA aplicável
- **Entrega**: Modo de entrega (genérico por agora)
- **Validade**: Prazo e data de expiração

Todas as informações fluem horizontalmente numa estrutura de tabela fácil de ler, em vez de uma lista vertical com bullets.

## Complexidade

Baixa - Apenas alteração de layout HTML/CSS

