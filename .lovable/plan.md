

# Plano: Corrigir o Ecrã de Gestores

## Diagnóstico

Após análise do código e dos dados (4731 leads, 599 contactos, 83 empresas), identifiquei os seguintes problemas:

1. **`fetchAllRows` tem bug de reutilização do query builder** — O `queryBuilder` (resultado de `workspaceClient.from("leads")`) é reutilizado em cada iteração do loop. Em Supabase JS v2, chamar `.select()` múltiplas vezes no mesmo `PostgrestQueryBuilder` pode acumular estado. A solução é receber uma factory function em vez de uma instância.

2. **Diálogo de atribuição limitado a 200 entidades** — Com ~4375 leads não atribuídas, o utilizador só vê 200. Falta pesquisa/filtro dentro do diálogo para encontrar entidades específicas.

3. **Diálogo não invalida a query de entidades após atribuição** — Depois de atribuir, a lista de não atribuídos não se actualiza (falta invalidar `unassigned-entities`).

4. **Contagem "Não Atribuídos" possivelmente incorrecta** — O valor 3969 no ecrã não bate com os ~5057 esperados (4375 leads + 599 contactos + 83 empresas). Pode ser RLS, mas vale garantir que o `workspaceClient` está a fazer count correcto.

5. **Sem feedback de loading nos KPIs** — Os cards aparecem com "0" enquanto carregam, sem skeleton/spinner.

## Plano de Implementação

### 1. Corrigir `fetchAllRows` — usar factory function
Alterar a assinatura para receber `() => queryBuilder` em vez do builder directo, garantindo que cada página cria uma chain nova.

### 2. Adicionar pesquisa no diálogo de atribuição
Adicionar campo de pesquisa no `BulkAssignDialog` para filtrar entidades por nome. Aumentar limit para 500.

### 3. Invalidar queries após atribuição
No `handleAssign`, após sucesso, invalidar também `["unassigned-entities"]` para que a lista se actualize.

### 4. Adicionar loading states nos KPIs
Mostrar skeleton/spinner nos `StatCard` enquanto `statsLoading` ou `membersLoading` estiverem activos.

### 5. Limpar e robustecer
- Garantir que o `onAssigned` callback invalida todas as queries relevantes
- Adicionar `refetchOnWindowFocus: false` nas queries pesadas para evitar re-fetches desnecessários

## Ficheiros a Alterar

- `src/pages/dashboard/GestoresPage.tsx` — todas as correcções acima num único ficheiro

## Critérios de Aceitação

- KPIs mostram valores correctos e consistentes com a BD
- `fetchAllRows` funciona sem bugs de estado acumulado
- Diálogo de atribuição tem pesquisa e actualiza após atribuição
- Cards mostram loading state adequado

