

# Plano de Correção — Módulo Gestores

## Diagnóstico

### Causa raiz
O módulo está **correctamente ligado** ao campo `assigned_to` das tabelas `leads`, `contacts` e `companies`. No entanto, existem **3 problemas concretos** que explicam os dados errados:

1. **Pipeline a €0**: O módulo calcula pipeline somando `estimated_value` das leads. Mas o pipeline real deveria vir da tabela `opportunities` (campo `value`, com `owner_id` como ownership). As leads têm `estimated_value` mas quase nenhuma tem valor preenchido. As oportunidades têm €52.947 reais.

2. **Conversão a 0%**: O módulo filtra por `lifecycle_stage === "customer" || "converted"`, mas **a coluna `lifecycle_stage` não existe** na tabela `leads`. A query falha silenciosamente (campo não retornado = undefined), resultando em 0 conversões sempre.

3. **Dados reais no DB**: Existem 404 leads atribuídas (396 + 8), mas 0 contactos e 0 empresas atribuídas. Os 4.327 leads não atribuídas e 599 contactos e 83 empresas sem atribuição são números reais — não são erro do módulo.

### Ficheiros envolvidos
- `src/pages/dashboard/GestoresPage.tsx` — ficheiro único (1097 linhas) com toda a lógica

### Campos de ownership validados
| Tabela | Campo ownership | Populado? |
|--------|----------------|-----------|
| leads | `assigned_to` | ✅ 404/4731 |
| contacts | `assigned_to` | ❌ 0/599 |
| companies | `assigned_to` | ❌ 0/83 |
| opportunities | `owner_id` | ✅ 17/17 |

### Inconsistências encontradas
1. Pipeline usa `leads.estimated_value` em vez de `opportunities.value`
2. Conversão usa campo inexistente `lifecycle_stage`
3. Oportunidades não são consideradas no módulo (nem contadas nem somadas)
4. Não existe indicador de saúde do módulo

---

## Plano de Implementação

### Fase 1 — Corrigir Pipeline (usar opportunities)

Alterar a query `manager-stats` para:
- Buscar também `opportunities` com `owner_id`, `value`, `status`, `lead_id`
- Pipeline por gestor = `SUM(opportunities.value)` onde `owner_id = user_id` e `status NOT IN ('lost')`
- Manter `estimated_value` das leads como valor secundário se não houver oportunidades

### Fase 2 — Corrigir Taxa de Conversão

A coluna `lifecycle_stage` não existe. Usar alternativa realista:
- **Fórmula**: `opportunities com status='won' / total leads atribuídas ao gestor`
- Se não houver leads atribuídas, mostrar "—" em vez de 0%
- Documentar fórmula no código com comentário

### Fase 3 — Adicionar contagem de oportunidades

Adicionar ao `ManagerStats`:
- `totalOpportunities: number`
- `wonOpportunities: number`
- Mostrar no card do gestor e na vista de detalhe

### Fase 4 — Corrigir detalhe do gestor

Na vista de detalhe (`selectedManager`):
- Remover referências a `lifecycle_stage` 
- Usar dados reais de oportunidades para conversão e pipeline
- Pipeline no detalhe = soma de `opportunities.value` do gestor

### Fase 5 — Adicionar indicadores de saúde

Adicionar no topo da página (lista):
- Percentagem de entidades atribuídas vs total
- Indicador visual (verde/amarelo/vermelho) de cobertura de atribuição
- Timestamp da última actualização dos dados

### Fase 6 — Melhorar "Não Atribuídos"

O bloco actual está correcto na lógica (`IS NULL`), mas:
- Incluir também oportunidades sem `owner_id` na contagem
- Tratar empty string como não atribuído (adicionar filtro `.or('assigned_to.is.null,assigned_to.eq.')`)

---

## Detalhes Técnicos

### Query de oportunidades a adicionar no `fetchAllRows`
```typescript
const opportunities = await fetchAllRows<any>(
  () => workspaceClient.from("opportunities"),
  "id, owner_id, value, status, lead_id",
  (q: any) => q.eq("workspace_id", currentWorkspace.id)
);
```

### Fórmulas finais
- **Pipeline**: `SUM(opportunities.value) WHERE owner_id = manager AND status != 'lost'`
- **Conversão**: `COUNT(opportunities WHERE status='won' AND owner_id=manager) / COUNT(leads WHERE assigned_to=manager) * 100`
- **Não atribuídos**: `WHERE assigned_to IS NULL OR assigned_to = ''`

### Ficheiros a alterar
- `src/pages/dashboard/GestoresPage.tsx` — correções cirúrgicas nas queries e agregações

### Riscos
- Nenhuma migração necessária — os campos já existem
- As oportunidades usam `owner_id` (não `assigned_to`) — documentar diferença
- Workspace members que não são gestores continuam a aparecer (todos os roles) — manter comportamento actual

