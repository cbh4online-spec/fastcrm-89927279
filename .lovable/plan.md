

# Remover Dados Demonstrativos do FastClub

Limpeza de todos os registos semente inseridos durante as fases de desenvolvimento do ecossistema FastClub.

---

## Dados a remover

### 1. `fastclub_content_sections` (41 registos)

Todos os registos com os seguintes `page_key`:
- `start-here` (2 registos)
- `metodo-pare` (4 registos)
- `demos` (2 registos)
- `resultados` (5 registos)
- `missao-semana` (4 registos)
- `implementacao` (6 registos)
- `ia-avancada` (10 registos)
- `laboratorio` (4 registos)
- `hot-seats` (5 registos)

### 2. `forum_topics` (12 registos)

Os 12 topicos exemplo criados nos canais FastMatch.

### 3. `forum_categories` (6 registos)

As 6 categorias com slug `fastmatch-*`.

### 4. `fastclub_challenges` (7 registos)

Os 7 desafios semente do Desafio 7 Dias.

### 5. `fastclub_crm_aggregates` (4 registos)

Os 4 registos de metricas agregadas.

---

## Ordem de execucao

A ordem e importante por causa de dependencias (foreign keys):

1. Primeiro: `forum_topics` (dependem de `forum_categories`)
2. Depois: `forum_categories` com slug `fastmatch-*`
3. Depois: `fastclub_content_sections` (todos os registos listados)
4. Depois: `fastclub_challenges`
5. Por fim: `fastclub_crm_aggregates`

---

## Detalhe tecnico

Serao executados 5 DELETE statements via a ferramenta de dados:

```sql
-- 1. Forum topics dos canais FastMatch
DELETE FROM forum_topics WHERE category_id IN (
  SELECT id FROM forum_categories WHERE slug LIKE 'fastmatch-%'
);

-- 2. Categorias FastMatch
DELETE FROM forum_categories WHERE slug LIKE 'fastmatch-%';

-- 3. Todas as content sections do FastClub
DELETE FROM fastclub_content_sections;

-- 4. Desafios semente
DELETE FROM fastclub_challenges;

-- 5. Agregados CRM
DELETE FROM fastclub_crm_aggregates;
```

Nenhum ficheiro de codigo sera alterado -- as paginas continuarao a funcionar mas mostrarao os empty states ate que dados reais sejam inseridos.

