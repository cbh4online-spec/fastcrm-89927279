
# Plano: Duplicar Proposta e Ferramentas de Produtividade

## Contexto

O sistema de propostas já tem infraestrutura preparada para duplicação (o `ProposalQuickLinks` tem props `onDuplicate` e `onCreateTask`), mas a lógica ainda não está implementada. Vamos adicionar funcionalidades que aceleram o fluxo de trabalho comercial.

## Funcionalidades a Implementar

| Ferramenta | Descrição | Impacto |
|------------|-----------|---------|
| **Duplicar Proposta** | Cria cópia completa como rascunho (título, itens, secções) | Alto - Reutilização de propostas |
| **Criar Tarefa** | Associa follow-up/lembretes à proposta | Médio - Gestão de pipeline |
| **Alterar Estado** | Mudança rápida de estado (Aceite/Rejeitada) | Alto - Fecho de negócio |
| **Exportar PDF** | Acesso directo ao PDF do dropdown | Médio - Conveniência |
| **Arquivar/Desarquivar** | Gestão de propostas antigas | Baixo - Organização |

## Arquitectura da Duplicação

### Fluxo de Dados

```text
┌─────────────────┐
│ Proposta Original │
├─────────────────┤
│ • ID: abc123     │
│ • Título         │
│ • Items[]        │
│ • scope_data     │
│ • timeline_data  │
│ • references_data│
│ • conditions     │
└────────┬────────┘
         │ useDuplicateProposal
         ▼
┌─────────────────┐
│ Nova Proposta    │
├─────────────────┤
│ • ID: novo       │
│ • Título (cópia) │
│ • Status: draft  │
│ • Items[] (copy) │
│ • Todas secções  │
│ • Novo slug      │
└─────────────────┘
```

### Dados a Copiar

- **Proposta base**: título, currency, cta_text, cta_color, validity_days, payment_conditions, notes
- **Dados JSONB**: scope_data, timeline_data, references_data
- **Itens**: proposal_items com product_id, name, description, quantity, unit_price, position, costs
- **NÃO copiar**: slug (novo), created_at, views_count, status (sempre draft), published_at, accepted_at

## Implementação Técnica

### 1. Hook `useDuplicateProposal` (useProposals.ts)

```typescript
export function useDuplicateProposal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      // 1. Fetch original proposal with items
      const { data: original } = await supabase
        .from("proposals")
        .select("*, proposal_items:proposal_items(*)")
        .eq("id", proposalId)
        .single();

      // 2. Generate new slug
      const slug = generateSlug();

      // 3. Create new proposal as draft
      const { data: newProposal } = await supabase
        .from("proposals")
        .insert({
          workspace_id: currentWorkspace.id,
          opportunity_id: original.opportunity_id,
          slug,
          title: `${original.title} (cópia)`,
          content_blocks: original.content_blocks,
          variables: original.variables,
          styles: original.styles,
          cta_text: original.cta_text,
          cta_color: original.cta_color,
          price: original.price,
          currency: original.currency,
          status: "draft",
          contact_id: original.contact_id,
          company_id: original.company_id,
          payment_conditions: original.payment_conditions,
          validity_days: original.validity_days,
          notes: original.notes,
          billing_address: original.billing_address,
          billing_nif: original.billing_nif,
          scope_data: original.scope_data,
          timeline_data: original.timeline_data,
          references_data: original.references_data,
          assigned_to: user?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      // 4. Copy items
      if (original.proposal_items?.length > 0) {
        const itemsToInsert = original.proposal_items.map((item, idx) => ({
          proposal_id: newProposal.id,
          workspace_id: currentWorkspace.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          position: idx,
          is_enabled: item.is_enabled,
          cost_snapshot: item.cost_snapshot,
          operational_cost_snapshot: item.operational_cost_snapshot,
        }));
        await supabase.from("proposal_items").insert(itemsToInsert);
      }

      return newProposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta duplicada com sucesso!");
      return data;
    },
  });
}
```

### 2. Acções no Dropdown (ProposalsList.tsx)

Adicionar ao menu de acções de cada proposta:

```typescript
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => setDetailId(proposal.id)}>
    <Eye className="h-4 w-4 mr-2" />
    Ver detalhes
  </DropdownMenuItem>
  
  {/* Duplicar */}
  <DropdownMenuItem onClick={() => handleDuplicate(proposal.id)}>
    <Copy className="h-4 w-4 mr-2" />
    Duplicar
  </DropdownMenuItem>
  
  {/* Criar Tarefa */}
  <DropdownMenuItem onClick={() => handleOpenTaskDialog(proposal)}>
    <CheckSquare className="h-4 w-4 mr-2" />
    Criar Tarefa
  </DropdownMenuItem>
  
  {/* Alterar Estado */}
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>
      <ArrowRightLeft className="h-4 w-4 mr-2" />
      Alterar Estado
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      <DropdownMenuItem onClick={() => handleStatusChange(proposal.id, "accepted")}>
        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
        Marcar como Aceita
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleStatusChange(proposal.id, "rejected")}>
        <XCircle className="h-4 w-4 mr-2 text-red-500" />
        Marcar como Rejeitada
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>
  
  {/* Export PDF */}
  <DropdownMenuItem onClick={() => handleExportPdf(proposal.id)}>
    <Download className="h-4 w-4 mr-2" />
    Exportar PDF
  </DropdownMenuItem>
  
  <DropdownMenuSeparator />
  
  {/* Existing actions... */}
</DropdownMenuContent>
```

### 3. Diálogo de Criação de Tarefa

Reutilizar o componente `CreateTaskDialog` existente, ligando a tarefa à oportunidade associada à proposta:

```typescript
const [taskDialogOpen, setTaskDialogOpen] = useState(false);
const [taskProposal, setTaskProposal] = useState<Proposal | null>(null);

const handleOpenTaskDialog = (proposal: Proposal) => {
  setTaskProposal(proposal);
  setTaskDialogOpen(true);
};

const handleCreateTask = async (taskData) => {
  await createTask.mutateAsync({
    ...taskData,
    related_type: "opportunity",
    related_id: taskProposal?.opportunity_id,
  });
  setTaskDialogOpen(false);
};
```

### 4. Acções na Página de Detalhe

Adicionar botões de acção rápida ao header do `ProposalDetailDialog`:

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleDuplicate}>
      <Copy className="h-4 w-4 mr-2" />
      Duplicar Proposta
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setShowTaskDialog(true)}>
      <CheckSquare className="h-4 w-4 mr-2" />
      Criar Tarefa
    </DropdownMenuItem>
    {proposal.status === "published" && (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleStatusChange("accepted")}>
          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
          Marcar como Aceita
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange("rejected")}>
          <XCircle className="h-4 w-4 mr-2 text-red-500" />
          Marcar como Rejeitada
        </DropdownMenuItem>
      </>
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useProposals.ts` | Adicionar `useDuplicateProposal` hook |
| `src/components/proposals/ProposalsList.tsx` | Adicionar acções ao dropdown: duplicar, tarefa, estado, PDF |
| `src/components/proposals/ProposalDetailDialog.tsx` | Adicionar menu de acções rápidas no header |

## Fluxo de UX

### Duplicar da Listagem

```text
1. Utilizador clica "..." na linha da proposta
2. Selecciona "Duplicar"
3. Sistema cria cópia como rascunho
4. Toast: "Proposta duplicada com sucesso!"
5. Nova proposta aparece na listagem
6. (Opcional) Abrir automaticamente para edição
```

### Criar Tarefa da Proposta

```text
1. Utilizador clica "Criar Tarefa" no menu
2. Abre diálogo com:
   - Título pré-preenchido: "Follow-up: [Nome Proposta]"
   - Data: +3 dias (configurável)
   - Prioridade
3. Tarefa criada ligada à oportunidade
4. Toast: "Tarefa criada!"
```

### Alterar Estado Rapidamente

```text
1. Utilizador clica "Alterar Estado" > "Marcar como Aceita"
2. Confirmação opcional
3. Estado actualizado
4. Toast: "Proposta marcada como aceita!"
5. Tracking GTM disparado se aceite
```

## Benefícios

1. **Reutilização** - Propostas semelhantes podem ser criadas em segundos
2. **Produtividade** - Menos cliques para acções frequentes
3. **Rastreabilidade** - Tarefas de follow-up não se perdem
4. **Fecho Rápido** - Alterar estado sem entrar no detalhe
5. **Consistência** - Segue padrões existentes no projeto (B2B orders)

## Complexidade

Média - 3 ficheiros com lógica nova mas seguindo padrões estabelecidos.
