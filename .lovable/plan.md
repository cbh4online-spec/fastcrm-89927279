
# Plano: Adicionar Funcionalidade de Reenviar Convites

## Objectivo
Permitir que os administradores reenviem convites de email para clientes B2B que ainda estejam com estado "pendente".

## Alteracoes Necessarias

### 1. Actualizar ClientUsersList.tsx

Adicionar opcao "Reenviar Convite" no menu dropdown de accoes:

```text
Menu Accoes (DropdownMenu):
  - Ver Detalhes
  - Editar
  + Reenviar Convite (NOVO - apenas visivel para status "pending")
```

A nova opcao ira:
- Aparecer apenas quando `client.status === "pending"`
- Usar o icone `Send` ou `RefreshCw` do Lucide
- Chamar uma funcao `handleResendInvitation(client)`

### 2. Implementar Logica de Reenvio

Criar uma mutation para reenviar o convite:

```typescript
const resendInvitationMutation = useMutation({
  mutationFn: async (client: ClientUser) => {
    // Buscar nome do workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", client.workspace_id)
      .single();

    // Chamar Edge Function existente
    const { error } = await supabase.functions.invoke(
      "send-client-invitation",
      {
        body: {
          clientName: client.name,
          clientEmail: client.email,
          workspaceName: workspace?.name || "FastCRM",
          portalUrl: `${window.location.origin}/client-portal`,
        },
      }
    );

    if (error) throw error;
    return client;
  },
  onSuccess: (client) => {
    toast.success(`Convite reenviado para ${client.email}`);
  },
  onError: (error) => {
    toast.error("Erro ao reenviar convite: " + error.message);
  },
});
```

### 3. Adicionar Botao no Card de Detalhes

No `ClientDetailCard`, quando o cliente tiver status "pending", mostrar um botao proeminente para reenviar convite:

```text
+----------------------------------+
|  Nome do Cliente                 |
|  Badge: Pendente                 |
+----------------------------------+
|  Email: cliente@email.pt         |
|  Telefone: +351 912 345 678      |
|                                  |
|  [Reenviar Convite]  <-- NOVO    |
|                                  |
+----------------------------------+
|  Encomendas Recentes             |
|  ...                             |
+----------------------------------+
```

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/client-users/ClientUsersList.tsx` | Adicionar opcao no dropdown + mutation + botao no card de detalhes |

## Detalhes Tecnicos

- Reutiliza a Edge Function `send-client-invitation` existente
- Nao e necessario criar nenhum novo endpoint
- A opcao de reenvio apenas aparece para clientes com `status: "pending"`
- Adicionar estados de loading durante o reenvio (icone spinner)
- Importar icone `Send` ou `RefreshCw` do Lucide

## Fluxo de Utilizador

1. Admin ve lista de clientes
2. Cliente pendente tem opcao "Reenviar Convite" no menu de accoes
3. Admin clica na opcao
4. Sistema mostra toast de confirmacao
5. Email e reenviado ao cliente

## Validacoes

- Verificar que o cliente tem email valido antes de reenviar
- Bloquear botao durante o envio para evitar cliques multiplos
- Mostrar feedback visual (toast) de sucesso ou erro
