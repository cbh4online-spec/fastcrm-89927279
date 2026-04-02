

# Fix: Botões "Aceitar Proposta" e "Solicitar Alteração" sem funcionalidade

## Diagnóstico

Os botões na `ProposalInternalView.tsx` (linhas 474-475) são puramente decorativos — não têm `onClick` nem qualquer lógica associada. São `<Button>` sem handlers.

## Solução

### 1. Adicionar callbacks ao `ProposalInternalView`

Expandir a interface `ProposalInternalViewProps` com dois callbacks opcionais:
- `onAccept?: () => void`
- `onRequestChange?: () => void`

Ligar aos botões existentes via `onClick`. Esconder os botões se a proposta já estiver aceite/rejeitada.

### 2. Implementar lógica no `ProposalDetailContent`

No componente pai que renderiza `ProposalInternalView`:
- **Aceitar Proposta**: chamar `useUpdateProposal` com `{ status: "accepted", accepted_at: new Date().toISOString() }` + toast de sucesso
- **Solicitar Alteração**: abrir um dialog simples com textarea para o utilizador escrever o pedido de alteração, e ao submeter:
  - Registar na `proposal_activity_logs` (action: `change_requested`, details com a mensagem)
  - Mudar status para `draft` (volta ao rascunho para edição)
  - Toast de confirmação

### 3. Criar `ProposalChangeRequestDialog`

Dialog com:
- Textarea para descrever as alterações pedidas
- Botão cancelar / submeter
- Ao submeter: insere activity log + actualiza status

### 4. Controlo de visibilidade

Os botões só aparecem quando `proposal.status === "published"` (faz sentido aceitar/pedir alteração apenas em propostas publicadas).

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/components/proposals/ProposalInternalView.tsx` | Adicionar props `onAccept`, `onRequestChange`; condicionar visibilidade por status; ligar `onClick` |
| `src/components/proposals/ProposalDetailContent.tsx` | Passar callbacks ao `ProposalInternalView`; implementar lógica de aceitar e solicitar alteração |
| `src/components/proposals/ProposalChangeRequestDialog.tsx` | Novo dialog para pedido de alteração com textarea |

