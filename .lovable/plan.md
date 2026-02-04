

# Plano: Adicionar Ordenação por Nome, Empresa e Temperatura

## Problema Identificado

A tabela de contactos (`SmartContactsTable.tsx`) tem um dropdown de ordenação no toolbar mas a lógica de ordenação **não está implementada** - os dados nunca são ordenados.

## Situação Actual

| Opção | Código | Funciona? |
|-------|--------|-----------|
| Nome (A-Z) | `name_asc` | Não |
| Nome (Z-A) | `name_desc` | Não |
| Mais recentes | `created_desc` | Não |
| Mais antigos | `created_asc` | Não |
| Maior score | `score_desc` | Não |
| Menor score | `score_asc` | Não |

## Solução

### 1. Adicionar novas opções de ordenação

```typescript
const sortOptions = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "company_asc", label: "Empresa (A-Z)" },      // NOVO
  { value: "company_desc", label: "Empresa (Z-A)" },     // NOVO
  { value: "temperature_hot", label: "Temperatura (Quentes primeiro)" },  // NOVO
  { value: "temperature_cold", label: "Temperatura (Frios primeiro)" },   // NOVO
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigos" },
  { value: "score_desc", label: "Maior score" },
  { value: "score_asc", label: "Menor score" },
];
```

### 2. Implementar a lógica de ordenação

Modificar o `filteredContacts` para incluir ordenação:

```typescript
const filteredContacts = useMemo(() => {
  if (!contacts) return [];
  
  let result = contacts;
  
  // Aplicar pesquisa
  if (searchValue) {
    const lower = searchValue.toLowerCase();
    result = result.filter(c => { /* lógica existente */ });
  }
  
  // Aplicar ordenação
  result = [...result].sort((a, b) => {
    switch (sortValue) {
      case "name_asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name_desc":
        return (b.name || "").localeCompare(a.name || "");
      case "company_asc":
        return (a.company || "").localeCompare(b.company || "");
      case "company_desc":
        return (b.company || "").localeCompare(a.company || "");
      case "temperature_hot": {
        const order = { hot: 0, warm: 1, cold: 2 };
        return order[a.ai_temperature] - order[b.ai_temperature];
      }
      case "temperature_cold": {
        const order = { cold: 0, warm: 1, hot: 2 };
        return order[a.ai_temperature] - order[b.ai_temperature];
      }
      case "created_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "created_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "score_desc":
        return (b.contact_score || 0) - (a.contact_score || 0);
      case "score_asc":
        return (a.contact_score || 0) - (b.contact_score || 0);
      default:
        return 0;
    }
  });
  
  return result;
}, [contacts, searchValue, sortValue]);
```

## Alterações de Código

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/contacts/SmartContactsTable.tsx` | Adicionar 4 novas opções de ordenação + implementar lógica de sort |

## Resultado Esperado

O utilizador poderá ordenar a tabela de contactos por:
- Nome (A-Z / Z-A)
- Empresa (A-Z / Z-A)
- Temperatura (Quentes primeiro / Frios primeiro)
- Data de criação (Recentes / Antigos)
- Score (Maior / Menor)

