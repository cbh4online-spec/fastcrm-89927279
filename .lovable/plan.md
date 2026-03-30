

## Corrigir Visibilidade da Página CSAT

### Diagnóstico

A página `/dashboard/helpdesk/csat` fica presa nos skeletons de loading. O componente tem esta condição:

```tsx
if (isLoading || !metrics) { return skeletons }
```

Isto causa problemas em dois cenários:
1. **Erro na query** — `isLoading = false` mas `data = undefined`, logo `!metrics` é verdadeiro → skeletons eternos
2. **Query desactivada** — se `wid` for falsy, `enabled: false` → `isLoading = false`, `data = undefined` → skeletons eternos

A tabela `client_tickets` existe e o hook está correto, mas a página nunca mostra estado de erro nem estado vazio.

### Plano

**Ficheiro: `src/pages/dashboard/helpdesk/HelpdeskCSAT.tsx`**

1. Extrair `isError` e `error` do hook `useCSATDashboard`
2. Substituir a condição `if (isLoading || !metrics)` por:
   - Se `isLoading` → mostrar skeletons
   - Se `isError` → mostrar mensagem de erro com botão de retry
   - Se `!metrics` (query desactivada/sem dados) → mostrar estado vazio informativo
3. Manter o resto do componente intacto

**Ficheiro: `src/hooks/useCSATDashboard.ts`**

4. Remover o cast `(supabase as any)` — a tabela `client_tickets` existe nos types, usar tipagem correta
5. Adicionar `retry: 1` para evitar retries infinitos em caso de erro de permissão

### Alteração principal

```tsx
const { data: metrics, isLoading, isError, refetch } = useCSATDashboard(period);

if (isLoading) { /* skeletons */ }

if (isError || !metrics) {
  return (
    <DashboardLayout>
      <div className="p-6 text-center">
        <p>Não foi possível carregar os dados de CSAT</p>
        <Button onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    </DashboardLayout>
  );
}
```

