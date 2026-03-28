

## Remover diálogo de faturas recorrentes e redirecionar para renovações

### Alterações

**1. `src/components/invoices/RecurringInvoicesTab.tsx`**
- Remover o import e uso do `CreateRecurringInvoiceDialog`
- Substituir todo o conteúdo por uma página informativa que explica que a funcionalidade de faturas recorrentes está integrada no módulo de Renovações
- Botão "Ir para Renovações" que navega para `/dashboard/renewals`

**2. `src/components/invoices/CreateRecurringInvoiceDialog.tsx`**
- Eliminar o ficheiro (já não será usado)

**3. `src/pages/Invoices.tsx`**
- Manter o tab "Recorrentes" mas agora mostra a página de redirecionamento em vez do placeholder

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/components/invoices/RecurringInvoicesTab.tsx` | Reescrever com redirect para renovações |
| `src/components/invoices/CreateRecurringInvoiceDialog.tsx` | Eliminar |

