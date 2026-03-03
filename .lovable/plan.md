

# Filtros e Ordenação na Listagem de RFQs

## Objetivo
Adicionar à `RFQsPage` pesquisa por texto, filtro por estado, e ordenação por data limite / data criação, reutilizando o componente `Toolbar` existente.

## Alterações

### `src/pages/procurement/RFQsPage.tsx`
- Adicionar estados locais: `search`, `statusFilter`, `sortBy`
- Importar e usar o componente `Toolbar` com:
  - **Pesquisa** por título ou nome do projeto
  - **Filtro por estado** via botões ou select (draft, sent, receiving_quotes, evaluated, awarded, closed)
  - **Ordenação** com opções: "Data Limite ↑", "Data Limite ↓", "Data Criação ↑", "Data Criação ↓"
- Aplicar filtros e ordenação client-side sobre os dados já carregados (`useMemo`)
- Adicionar coluna `Nº RFQ` (`rfq_number`) na tabela
- Formatar `due_date` com `format()` e badge colorido (vermelho se expirado)

### Ficheiros alterados
- `src/pages/procurement/RFQsPage.tsx` (único ficheiro)

### Lógica de filtragem (client-side)
```text
rfqs
  → filter by statusFilter (if not "all")
  → filter by search (match title, project name, rfq_number)
  → sort by sortBy field
```

Nenhuma alteração ao hook `useRFQ.ts` — os dados já incluem `due_date`, `rfq_number` e `procurement_projects.name`.

