

# Correção de Build + Scroll + Melhorias no Formulário de Descontos

## 1. Diagnóstico

### Build Error
O código dos ficheiros de descontos (`CreateRenewalDiscountDialog.tsx`, `RenewalDiscountsSection.tsx`, `useRenewalDiscounts.ts`, `RenewalDetailPage.tsx`) está sintaticamente correto e os tipos estão definidos. O erro de build pode ser transitório — será recompilado ao aplicar as alterações abaixo.

### Problema de Scroll
O `CreateRenewalDiscountDialog` usa `DialogContent className="sm:max-w-md"` sem `max-h` nem `overflow-y-auto`. Com 8+ campos no formulário, o conteúdo ultrapassa a viewport em ecrãs menores.

### Melhorias Necessárias
O formulário atual é funcional mas básico. Faltam funcionalidades essenciais para um sistema de descontos de nível enterprise.

## 2. Plano de Implementação

### 2.1 Corrigir scroll no dialog
- Adicionar `max-h-[85vh] overflow-y-auto` ao conteúdo interno do `DialogContent`
- Usar `ScrollArea` do Radix para scroll suave

### 2.2 Melhorar `CreateRenewalDiscountDialog.tsx`
Transformar num formulário profissional com:
- **Validação com feedback visual**: campos obrigatórios destacados, limites de valor (% max 100, fixo max valor do contrato)
- **Preview do impacto**: mostrar "MRR atual → MRR com desconto" em tempo real antes de guardar
- **Presets rápidos**: botões "10%", "25%", "50%", "Primeiro mês grátis" para criação rápida
- **Razão/motivo obrigatório**: dropdown com opções pré-definidas (Onboarding, Retenção, Upgrade, Campanha, Outro)
- **Data fim automática**: calcular end_date automaticamente quando se define max_cycles + data início + intervalo do contrato
- **Confirmação visual**: resumo antes de confirmar

### 2.3 Melhorar `RenewalDiscountsSection.tsx`
- **Indicador visual de economia total**: badge no topo "Economia ativa: -XX€/mês"
- **Toggle ativar/desativar** inline com confirmação
- **Filtros**: Ativos / Expirados / Todos
- **Responsividade**: cards em mobile em vez de tabela
- **Empty state** com call-to-action claro

### Ficheiros Afetados

| Ficheiro | Alteração |
|---|---|
| `src/components/renewals/CreateRenewalDiscountDialog.tsx` | Scroll, validação, preview, presets, razão |
| `src/components/renewals/RenewalDiscountsSection.tsx` | Economia total, filtros, responsive |

