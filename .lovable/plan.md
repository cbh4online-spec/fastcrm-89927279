

# Adicionar campo Email ao formulário de edição de cliente

## Diagnóstico

O `EditClientDialog.tsx` já permite editar nome, telefone, NIF, etc., mas **não tem campo para email**. Agora que `client_users.email` é nullable, deve ser possível ver e editar o email do cliente.

## Solução

Alterar apenas `src/components/client-users/EditClientDialog.tsx`:

1. **Schema zod** (linha 38-54): adicionar `email: z.string().email().optional().or(z.literal(""))` ao schema
2. **Default values** (linha 76-92): adicionar `email: ""`
3. **Reset** (linha 98): adicionar `email: client.email || ""`
4. **Submit** (linha 122-145): incluir `email: data.email || null` no objecto `updates`
5. **Formulário**: adicionar campo Email na secção de dados básicos (junto ao telefone)

## Ficheiro alterado

| Ficheiro | Alteração |
|---|---|
| `src/components/client-users/EditClientDialog.tsx` | Adicionar campo email ao schema, defaults, reset, submit e formulário |

