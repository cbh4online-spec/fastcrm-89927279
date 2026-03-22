

# Corrigir Contagens de Uso nos Workspaces

## Problema

As queries de contagem de leads, contactos e empresas (linhas 198-225 do `WorkspacesSection.tsx`) fazem `supabase.from("leads").select("workspace_id")` — que está limitado a **1000 rows** pelo Supabase. O workspace "Metodo PARE" tem 559+ leads mas a contagem está truncada.

O mesmo problema afeta contactos (496) e empresas (58) — qualquer tabela com mais de 1000 registos totais entre todos os workspaces devolve contagens erradas.

## Solução

### 1. Criar RPC `get_workspace_usage_counts` (Migration)

Função SQL que faz `COUNT(*)` agrupado por `workspace_id` para as 3 tabelas numa única chamada, sem limite de rows:

```sql
CREATE OR REPLACE FUNCTION get_workspace_usage_counts()
RETURNS TABLE(workspace_id uuid, leads_count bigint, contacts_count bigint, companies_count bigint)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT 
    w.id AS workspace_id,
    COALESCE(l.cnt, 0) AS leads_count,
    COALESCE(co.cnt, 0) AS contacts_count,
    COALESCE(cm.cnt, 0) AS companies_count
  FROM workspaces w
  LEFT JOIN (SELECT workspace_id, COUNT(*) AS cnt FROM leads GROUP BY workspace_id) l ON l.workspace_id = w.id
  LEFT JOIN (SELECT workspace_id, COUNT(*) AS cnt FROM contacts GROUP BY workspace_id) co ON co.workspace_id = w.id
  LEFT JOIN (SELECT workspace_id, COUNT(*) AS cnt FROM companies GROUP BY workspace_id) cm ON cm.workspace_id = w.id;
$$;
```

### 2. Atualizar `WorkspacesSection.tsx`

Substituir as 3 queries separadas (leads, contacts, companies — linhas 197-225) por uma única chamada:
```ts
const { data: usageCounts } = await supabase.rpc('get_workspace_usage_counts');
```

Mapear o resultado para o objeto `usage` de cada workspace.

## Ficheiros
- **Migration SQL** — nova RPC `get_workspace_usage_counts`
- **`src/components/super-admin/WorkspacesSection.tsx`** — substituir 3 queries por 1 RPC

