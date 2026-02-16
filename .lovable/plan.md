
# Integrar Templates Verticais AIDA no modulo de Funis

## Problema

O modulo de Funis (`FunnelsList`) so mostra registos da tabela `funnels`. Os templates verticais AIDA (como "Ginasios") estao na tabela `vertical_templates` e eram mostrados no antigo componente `LandingPagesList`. Ao redirecionar tudo para Funis, os templates AIDA desapareceram.

## Solucao

Integrar o conteudo do antigo `LandingPagesList` dentro do `FunnelsList`, para que numa unica pagina o utilizador veja:

1. **Templates Verticais (AIDA)** - templates estaticos + custom da tabela `vertical_templates`
2. **Funis** - funis multi-step da tabela `funnels`

## Alteracoes

### 1. `src/components/funnels/FunnelsList.tsx`

Adicionar ao componente existente:

- Importar `useVerticalTemplates`, `useDeleteVerticalTemplate`, `useAllVerticalKPIs`, `verticalConfigs`, e o `VerticalTemplateBuilder`
- Adicionar estado para `builderMode` e `editingTemplateId` (para abrir o builder de templates AIDA)
- Adicionar estado para `deleteTemplateId`
- Renderizar a seccao "Templates Verticais (AIDA)" antes da lista de funis, replicando a logica que ja existe em `LandingPagesList`:
  - Cards de templates estaticos (de `verticalConfigs`) com badge AIDA, KPIs e botao "Abrir"
  - Cards de templates custom (da BD) com botoes "Editar", "Abrir" e "Eliminar"
- Adicionar botao "Novo Template AIDA" no header junto ao "Novo Funil"
- Quando `builderMode` esta activo, renderizar o `VerticalTemplateBuilder` (mesmo comportamento do antigo)

### 2. `src/pages/Funnels.tsx`

Sem alteracoes necessarias -- ja aponta para `FunnelsList`.

### 3. Sem alteracoes de base de dados

Nao e necessaria nenhuma migracao. Os dados ja existem na tabela `vertical_templates`.

## Resultado

A pagina `/dashboard/funnels` mostra tudo numa vista unificada:
- Seccao "Templates Verticais (AIDA)" com os templates estaticos e custom, incluindo KPIs de analytics
- Seccao "Funis" com os funis multi-step
- Botoes para criar novos templates AIDA ou novos funis
