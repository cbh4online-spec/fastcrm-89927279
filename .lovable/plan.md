

# Plano: Actualizar Condições de Pagamento para Usar Dados Dinâmicos

## Problema Identificado

Existem 3 locais onde as condições de pagamento estão hardcoded em vez de usar a tabela dinâmica `payment_conditions`:

| Ficheiro | Problema |
|----------|----------|
| `src/components/proposals/ProposalConditionsSection.tsx` | Importa `PAYMENT_CONDITIONS` de `proposalConstants.ts` |
| `src/components/companies/sections/FinancialSection.tsx` | Define `PAYMENT_CONDITIONS` localmente |
| `src/components/contacts/eni/sections/FinancialSection.tsx` | Importa `PAYMENT_CONDITIONS` de `ENIContactTypes.ts` |

Já existe o hook `usePaymentConditions` e `usePaymentMethods` em `src/hooks/useProductSettings.ts` que busca os dados da base de dados.

## Solucao

Actualizar os 3 componentes para usar os hooks dinamicos com fallback para os valores estaticos (compatibilidade).

### 1. ProposalConditionsSection.tsx

```typescript
// Adicionar import
import { usePaymentConditions, PaymentConditionConfig } from "@/hooks/useProductSettings";

// Dentro do componente
const { data: paymentConditionsConfig } = usePaymentConditions();

// Criar lista combinada (dinamica + custom)
const paymentOptions = useMemo(() => {
  if (paymentConditionsConfig?.length) {
    const dynamicOptions = paymentConditionsConfig
      .filter(c => c.is_active)
      .sort((a, b) => a.position - b.position)
      .map(c => ({ value: c.code, label: c.label }));
    
    // Adicionar opcao "Personalizado" no final
    return [...dynamicOptions, { value: 'custom', label: 'Personalizado' }];
  }
  // Fallback para estatico
  return PAYMENT_CONDITIONS;
}, [paymentConditionsConfig]);

// No render, usar paymentOptions em vez de PAYMENT_CONDITIONS
{paymentOptions.map((condition) => (
  <SelectItem key={condition.value} value={condition.value}>
    {condition.label}
  </SelectItem>
))}
```

### 2. FinancialSection.tsx (Empresas)

```typescript
// Adicionar imports
import { usePaymentConditions, usePaymentMethods } from "@/hooks/useProductSettings";

// Dentro do componente
const { data: paymentConditionsConfig } = usePaymentConditions();
const { data: paymentMethodsConfig } = usePaymentMethods();

// Criar listas dinamicas
const paymentConditionsOptions = useMemo(() => {
  if (paymentConditionsConfig?.length) {
    return paymentConditionsConfig
      .filter(c => c.is_active)
      .sort((a, b) => a.position - b.position)
      .map(c => c.label);
  }
  return PAYMENT_CONDITIONS; // fallback estatico
}, [paymentConditionsConfig]);

const paymentMethodsOptions = useMemo(() => {
  if (paymentMethodsConfig?.length) {
    return paymentMethodsConfig
      .filter(m => m.is_active)
      .sort((a, b) => a.position - b.position)
      .map(m => m.label);
  }
  return PAYMENT_METHODS; // fallback estatico
}, [paymentMethodsConfig]);
```

### 3. FinancialSection.tsx (Contactos ENI)

Mesma abordagem do ponto 2.

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/proposals/ProposalConditionsSection.tsx` | Usar `usePaymentConditions` |
| `src/components/companies/sections/FinancialSection.tsx` | Usar `usePaymentConditions` e `usePaymentMethods` |
| `src/components/contacts/eni/sections/FinancialSection.tsx` | Usar `usePaymentConditions` e `usePaymentMethods` |

## Beneficios

- Novas condicoes criadas nas configuracoes aparecem imediatamente em propostas/empresas/contactos
- Compatibilidade total com dados existentes (fallback para valores estaticos)
- Consistencia em toda a aplicacao

## Testes

1. Criar nova condicao de pagamento nas configuracoes (ex: "120 dias")
2. Abrir uma proposta e verificar que a nova condicao aparece no dropdown
3. Abrir uma empresa e verificar que a nova condicao aparece
4. Abrir um contacto ENI e verificar que a nova condicao aparece

