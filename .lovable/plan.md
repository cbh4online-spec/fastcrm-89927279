
# Plano: Refresh Automático de Dados no Student Journey

## Problema Actual

Actualmente, quando há alterações nos perfis ou inscrições do Student Journey, os dados só são actualizados se:
- O utilizador clicar no botão "Atualizar Estados"
- A página for recarregada
- Uma mutação explícita invalidar as queries

## Solução: Realtime com Supabase

O projecto já utiliza realtime noutros módulos (CRM Activities, Messages, Meeting Automations). Vamos aplicar o mesmo padrão ao Student Journey.

## Alterações Necessárias

### 1. Base de Dados - Habilitar Realtime

Adicionar as tabelas do Student Journey à publicação realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.sj_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sj_enrollments;
```

### 2. Hook `useStudentJourney.ts` - Adicionar Subscriptions

**Modificar `useProfiles()`:**

```text
Adicionar:
- Import do useEffect
- Import do useWorkspaceInstance (para workspaceClient)
- Subscription realtime para INSERT, UPDATE, DELETE na tabela sj_profiles
- Cleanup da subscription no unmount
```

**Estrutura da subscription:**

```typescript
useEffect(() => {
  if (!currentWorkspace) return;

  const channel = supabase
    .channel(`sj-profiles-${currentWorkspace.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",  // INSERT, UPDATE, DELETE
        schema: "public",
        table: "sj_profiles",
        filter: `workspace_id=eq.${currentWorkspace.id}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
        queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [currentWorkspace, queryClient]);
```

**Modificar `useEnrollments()`:**

Mesma lógica mas para a tabela `sj_enrollments`:

```typescript
useEffect(() => {
  if (!currentWorkspace) return;

  const channel = supabase
    .channel(`sj-enrollments-${currentWorkspace.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sj_enrollments",
        filter: `workspace_id=eq.${currentWorkspace.id}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["sj-enrollments"] });
        queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
        queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [currentWorkspace, queryClient]);
```

## Fluxo de Actualização

```text
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Utilizador A    │     │     Backend       │     │  Utilizador B    │
│  (faz alteração) │     │    (Supabase)     │     │  (vê a lista)    │
└────────┬─────────┘     └─────────┬─────────┘     └────────┬─────────┘
         │                         │                        │
         │ UPDATE sj_profiles      │                        │
         │─────────────────────────>│                        │
         │                         │                        │
         │                         │ postgres_changes event │
         │                         │───────────────────────>│
         │                         │                        │
         │                         │        invalidateQueries
         │                         │                        │
         │                         │        Refetch automático
         │                         │                        │
         │                         │        Lista actualizada!
```

## Ficheiros a Modificar

| Ficheiro | Alterações |
|----------|------------|
| Migração SQL | Adicionar tabelas ao supabase_realtime |
| `src/hooks/useStudentJourney.ts` | Adicionar subscriptions realtime em `useProfiles` e `useEnrollments` |

## Benefícios

1. **Actualização automática** - Dados são actualizados assim que há alterações
2. **Multi-utilizador** - Se dois utilizadores estão a ver a mesma lista, ambos vêem as alterações
3. **Consistência** - KPIs, funil e listas sempre sincronizados
4. **Padrão existente** - Segue a mesma abordagem já usada noutros módulos do CRM

## Tabelas a Habilitar

| Tabela | Eventos |
|--------|---------|
| `sj_profiles` | INSERT, UPDATE, DELETE |
| `sj_enrollments` | INSERT, UPDATE, DELETE |
