

# Adicionar coluna "Pendente" na lista de faturas

## Problema
A lista de faturas mostra apenas a coluna "Total" mas não mostra o valor pendente (total - amount_paid), dificultando saber quanto falta receber em cada fatura.

## Plano

### 1. Adicionar coluna "Pendente" à tabela de faturas
- Adicionar um novo `<TableHead>` após "Total" com texto "Pendente" (traduzido)
- Adicionar o `<TableCell>` correspondente mostrando `invoice.total - (invoice.amount_paid || 0)`
- Destacar visualmente: texto verde quando pendente = 0 (pago), texto laranja/vermelho quando há valor pendente

### 2. Adicionar traduções
- Adicionar chave `colPending` nos ficheiros de tradução PT, EN e FR do namespace `invoices`

### 3. Garantir que `amount_paid` está no select da query
- Verificar no hook que busca faturas se `amount_paid` está incluído no select

**Ficheiros a alterar:**
- `src/pages/Invoices.tsx` — nova coluna na tabela
- `src/i18n/locales/pt/invoices.json` — tradução PT
- `src/i18n/locales/en/invoices.json` — tradução EN
- `src/i18n/locales/fr/invoices.json` — tradução FR

