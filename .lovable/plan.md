

# Plano: Tornar o Módulo de Gestores Funcional

## Diagnóstico

O módulo tem problemas estruturais que impedem o seu funcionamento correto:

1. **Falta `DashboardLayout`** — A página renderiza sem sidebar nem header, ao contrário de todas as outras páginas (Leads, Contacts, etc.)
2. **Limite de 1000 linhas do Supabase** — As queries de stats carregam todas as leads (4284+), contactos e empresas sem paginação, mas o Supabase só devolve 1000 por query. Os KPIs ficam errados.
3. **Atribuição em massa usa `supabase` diretamente** — o update via `supabase.from(entityType).update()` com table name dinâmico pode falhar por questões de tipagem TypeScript e pode não respeitar o contexto do workspace.
4. **Import não utilizado** (`Progress`) e variável não utilizada (`assignType`) geram warnings.

## Plano de Implementação

### 1. Envolver em DashboardLayout
- Adicionar `DashboardLayout` como wrapper na página, consistente com Leads, Contacts, Companies.

### 2. Corrigir queries para respeitar limite de 1000 rows
- Substituir o fetch de todas as entidades por queries de contagem agregada (count) por gestor usando `assigned_to`.
- Para stats de temperatura e pipeline, usar queries separadas com filtros server-side em vez de filtrar client-side.
- Abordagem: 3 queries com `select("assigned_to, lead_score, ai_temperature, estimated_value", { count: "exact" })` agrupadas no JS por `assigned_to` mas sem ultrapassar o limit — ou usar queries RPC/count.

**Alternativa pragmática**: manter a abordagem client-side mas paginar adequadamente com ranges (0-999, 1000-1999, etc.) até esgotar. Mais simples e sem necessidade de criar RPCs.

### 3. Corrigir BulkAssignDialog
- Tipar correctamente o `from(entityType as any)` para evitar erro de TypeScript.
- Invalidar queries de unassigned após atribuição.
- Adicionar tratamento de erro mais granular.

### 4. Limpar imports e variáveis não utilizadas
- Remover `Progress`, `assignType`, `useCallback`, etc.

### 5. Garantir que a rota funciona end-to-end
- DashboardLayout → carrega members → carrega stats → mostra cards → clique → detalhe → histórico → atribuição em massa.

## Critérios de Aceitação

- Página acessível via Comercial → Gestores com sidebar visível
- KPIs mostram totais correctos (sem truncar a 1000)
- Atribuição em massa funciona: selecionar entidades → escolher gestor → confirmar
- Histórico de interações carrega actividade, conversas e reuniões
- Sem erros de consola nem warnings de TypeScript

## Riscos

- Se houver mais de ~5000 entidades, a abordagem de paginação client-side pode ser lenta. Nesse caso, seria necessário criar uma função RPC para agregar server-side. Para já, a paginação resolve.

