

# Plano: Isolar Fluxos por Workspace

## Problema Identificado

Quando um utilizador com papel **super_admin** navega entre workspaces, está a ver fluxos de outros workspaces porque:

1. **Política RLS permissiva**: A regra `Super admins can manage all flows` permite que super admins vejam todos os fluxos do sistema, ignorando a filtragem por workspace
2. **Falta de validação no frontend**: A função `loadFlowDetails` carrega um fluxo apenas pelo `id`, sem verificar se pertence ao workspace actual

### Causa Raiz

```sql
-- Esta política permite que super admins vejam TUDO
Super admins can manage all flows: is_super_admin(auth.uid())
```

Embora o `loadFlows` filtre por `workspace_id`, o RLS permite que o super admin veja todos os dados, e não há validação adicional no frontend.

## Solução

### Abordagem: Validação no Frontend + Opção de Restrição no RLS

Vamos implementar uma dupla verificação:

1. **Frontend**: Adicionar validação de workspace em todas as operações de fluxos
2. **Backend (opcional)**: Manter RLS para super admins mas adicionar filtro de workspace explícito

## Alterações de Código

### 1. `useConversationalFlows.ts` - Validação de Workspace

#### A. Adicionar verificação em `loadFlowDetails`

```typescript
// Load flow details (steps + variables)
const loadFlowDetails = useCallback(async (flowId: string) => {
  if (!currentWorkspace?.id) return;
  
  setIsLoading(true);
  try {
    // ADICIONAR: Filtrar por workspace_id para garantir isolamento
    const [flowRes, stepsRes, varsRes] = await Promise.all([
      supabase
        .from('conversational_flows')
        .select('*')
        .eq('id', flowId)
        .eq('workspace_id', currentWorkspace.id)  // NOVO
        .single(),
      supabase.from('flow_steps').select('*').eq('flow_id', flowId).order('position'),
      supabase.from('flow_variables').select('*').eq('flow_id', flowId).order('position')
    ]);

    if (flowRes.error) {
      // Se não encontrar o fluxo no workspace actual, pode ser de outro workspace
      if (flowRes.error.code === 'PGRST116') {
        toast.error('Fluxo não encontrado neste workspace');
        return;
      }
      throw flowRes.error;
    }
    
    setCurrentFlow(mapFlowFromDB(flowRes.data));
    setSteps((stepsRes.data || []).map(mapStepFromDB));
    setVariables((varsRes.data || []).map(mapVariableFromDB));
  } catch (err) {
    console.error('Error loading flow details:', err);
    toast.error('Erro ao carregar detalhes do fluxo');
  } finally {
    setIsLoading(false);
  }
}, [currentWorkspace?.id]);
```

#### B. Adicionar verificação em `updateFlow`

```typescript
const updateFlow = useCallback(async (flowId: string, data: Partial<ConversationalFlow>) => {
  if (!currentWorkspace?.id) return null;
  
  // Verificar se o fluxo pertence ao workspace actual
  const { data: existingFlow } = await supabase
    .from('conversational_flows')
    .select('id')
    .eq('id', flowId)
    .eq('workspace_id', currentWorkspace.id)
    .single();
    
  if (!existingFlow) {
    toast.error('Fluxo não encontrado neste workspace');
    return null;
  }
  
  // ... resto da lógica existente
}, [currentWorkspace?.id]);
```

#### C. Adicionar verificação em `deleteFlow`

```typescript
const deleteFlow = useCallback(async (flowId: string) => {
  if (!currentWorkspace?.id) return false;
  
  try {
    // Verificar se o fluxo pertence ao workspace actual
    const { data: existingFlow } = await supabase
      .from('conversational_flows')
      .select('id')
      .eq('id', flowId)
      .eq('workspace_id', currentWorkspace.id)
      .single();
      
    if (!existingFlow) {
      toast.error('Fluxo não encontrado neste workspace');
      return false;
    }
    
    // ... resto da lógica existente
}, [currentWorkspace?.id, currentFlow?.id]);
```

### 2. Limpar estado ao mudar de workspace

Adicionar um `useEffect` para limpar o estado quando o workspace muda:

```typescript
// Limpar estado ao mudar de workspace
useEffect(() => {
  setCurrentFlow(null);
  setSteps([]);
  setVariables([]);
  setFlows([]);
}, [currentWorkspace?.id]);
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useConversationalFlows.ts` | Adicionar validação de workspace_id em loadFlowDetails, updateFlow, deleteFlow e limpar estado ao mudar workspace |

## Fluxo Após Implementação

```text
                    Utilizador (Super Admin)
                              │
                              ▼
                    Muda para Workspace B
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ useEffect detecta mudança de    │
            │ workspace_id e limpa estado     │
            │ (flows=[], currentFlow=null)    │
            └─────────────────────────────────┘
                              │
                              ▼
                    loadFlows() é chamado
                              │
                              ▼
            ┌─────────────────────────────────┐
            │ Query filtra por workspace_id   │
            │ SELECT * FROM conversational_   │
            │ flows WHERE workspace_id = B    │
            └─────────────────────────────────┘
                              │
                              ▼
              Mostra apenas fluxos do Workspace B
```

## Nota sobre RLS

As políticas de RLS para super admins permanecem inalteradas por design - super admins precisam de acesso total para gestão do sistema. O isolamento é garantido pelo filtro de workspace no código do frontend, que é a abordagem recomendada para multi-tenancy com super admins.

## Benefícios

1. **Isolamento garantido** - Fluxos são sempre filtrados pelo workspace actual
2. **UX consistente** - Ao mudar de workspace, os dados antigos são limpos
3. **Segurança mantida** - RLS continua a proteger os dados, o frontend adiciona UX layer
4. **Compatibilidade** - Super admins ainda podem aceder a dados de outros workspaces via painel de administração (se necessário)

