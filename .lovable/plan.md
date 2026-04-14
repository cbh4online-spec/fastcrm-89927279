

# Diagnóstico: KPIs de Renovação (MRR, ARR, LTV) mostram 0,00€

## Problema Identificado

A base de dados tem `total_mrr = 127.00` e o item confirma 127€ × 1 = 127€. No entanto, o campo `total_mrr` é **estático** — preenchido manualmente ou na criação — e não existe nenhum trigger que o recalcule quando itens são adicionados, editados ou removidos. Isto significa que:

1. **Deriva de dados**: Se os itens mudam, `total_mrr` fica desatualizado
2. **LTV = 0**: O cálculo usa `differenceInMonths(hoje, start_date)`. Como `start_date = 21/04/2026` (futuro), resultado = 0 meses → LTV = MRR × 0 = 0
3. **Sem fallback**: Se `total_mrr` for 0 por qualquer razão, os KPIs ficam todos a zero sem aviso

## Plano de Correção

### 1. Trigger de sincronização `total_mrr` (Migration)
Criar trigger na tabela `renewal_items` (INSERT/UPDATE/DELETE) que recalcula automaticamente `total_mrr` no contrato pai:

```sql
CREATE OR REPLACE FUNCTION sync_renewal_contract_mrr()
RETURNS trigger AS $$
BEGIN
  UPDATE renewal_contracts
  SET total_mrr = COALESCE((
    SELECT SUM(unit_price * qty)
    FROM renewal_items
    WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)
      AND status IN ('active', 'pending_renewal')
  ), 0),
  updated_at = now()
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Corrigir cálculo de LTV no frontend
**Ficheiro**: `src/pages/RenewalDetailPage.tsx`

- Quando `lifetimeMonths = 0` (contrato não iniciou ou acabou de iniciar), usar o intervalo contratual como projeção mínima em vez de multiplicar por 0
- Mostrar label distinta: "LTV Projetado" quando contrato é recente

### 3. Fallback: calcular MRR a partir dos itens
Se `total_mrr` do contrato for 0 mas existirem itens ativos, calcular o valor a partir dos itens carregados. Isto serve como rede de segurança até o trigger sincronizar.

**Ficheiro**: `src/pages/RenewalDetailPage.tsx`

```typescript
const contractValue = Number(contract.total_mrr || 0) || 
  items.filter(i => i.status === 'active' || i.status === 'pending_renewal')
       .reduce((s, i) => s + Number(i.unit_price) * Number(i.qty), 0);
```

### Ficheiros Afetados

| Ficheiro | Alteração |
|---|---|
| Migration SQL | Trigger `sync_renewal_contract_mrr` |
| `src/pages/RenewalDetailPage.tsx` | Fallback de items + LTV projetado |

### Critérios de Aceitação
- MRR sempre reflete a soma dos itens ativos
- ARR = MRR × 12, sempre com valor quando há itens
- LTV nunca mostra 0 quando há contrato ativo com itens — mostra projeção mínima de 1 ciclo
- Alterar/adicionar/remover itens atualiza automaticamente o `total_mrr` via trigger

