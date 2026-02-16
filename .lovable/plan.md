
# Migrar Landing Pages existentes para o sistema de Funis

## Problema

As landing pages existentes estao guardadas na tabela `landing_pages`, mas o modulo unificado de Funis so consulta a tabela `funnels`. Por isso, a landing page "LP" (e qualquer outra criada anteriormente) nao aparece na lista de funis.

## Solucao

Criar uma migracao SQL que converta automaticamente cada landing page existente num funil com os seus steps correspondentes. Depois da migracao, todas as paginas aparecerao no modulo de Funis.

## Passos

### 1. Migracao SQL

Executar um script que, para cada registo em `landing_pages`:

1. Crie um registo correspondente em `funnels` (mapeando title -> name, slug -> slug, is_published, etc.)
2. Crie um step do tipo "page" em `funnel_steps` com o conteudo da landing page (headline, subheadline, cta_text, cta_color)
3. Se a landing page tinha formulario ativo (`form_enabled = true`), crie um segundo step do tipo "optin"
4. Crie um terceiro step "thankyou"

### 2. Detalhe tecnico da migracao

```sql
-- Para cada landing page, inserir um funil + steps
INSERT INTO funnels (workspace_id, name, slug, is_published, published_at, created_by, created_at)
SELECT workspace_id, title, slug, COALESCE(is_published, false), published_at, created_by, created_at
FROM landing_pages;

-- Inserir steps "Home" com o conteudo da landing page
INSERT INTO funnel_steps (funnel_id, workspace_id, name, step_type, sort_order, content)
SELECT f.id, f.workspace_id, 'Home', 'page', 0,
  jsonb_build_object(
    'headline', lp.headline,
    'subheadline', lp.subheadline,
    'cta_text', lp.cta_text,
    'cta_color', lp.cta_color,
    'body', ''
  )
FROM landing_pages lp
JOIN funnels f ON f.slug = lp.slug AND f.workspace_id = lp.workspace_id;

-- Steps de formulario e obrigado seguem logica similar
```

### 3. Sem alteracoes de codigo

Nenhuma alteracao de codigo e necessaria. Depois da migracao, os dados ja estarao na tabela `funnels` e aparecerao automaticamente no modulo existente.
