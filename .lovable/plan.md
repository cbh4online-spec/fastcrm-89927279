

# Permitir converter propostas em encomendas sem email do cliente

## Diagnóstico

Duas barreiras impedem a conversão quando o contacto/empresa não tem email:

1. **Código** (`useConvertProposalToOrderNote.ts`, linha 99-101): `throw new Error("O contacto/empresa precisa de ter email...")` — bloqueia explicitamente.
2. **Base de dados**: coluna `client_users.email` é `NOT NULL` — mesmo removendo o check no código, o INSERT falharia.

## Solução

### 1. Migração DB — tornar `email` nullable em `client_users`

```sql
ALTER TABLE public.client_users ALTER COLUMN email DROP NOT NULL;
```

### 2. Alterar `useConvertProposalToOrderNote.ts`

- Remover o `throw` nas linhas 99-101
- Passar `email: clientEmail || null` no insert (em vez de exigir)

### Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| Migração SQL | `ALTER COLUMN email DROP NOT NULL` na tabela `client_users` |
| `src/hooks/useConvertProposalToOrderNote.ts` | Remover validação obrigatória de email (linhas 99-101); passar `null` quando não existe |

