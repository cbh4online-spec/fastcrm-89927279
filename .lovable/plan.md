
# Auto-provisionar Templates Estaticos na Base de Dados

## Problema

Quando se clica "Editar" num template estatico (ex: "Clinicas"), o `VerticalFunnelManager` abre mas:
- O tab "Conteudo" mostra apenas a mensagem "Este template e estatico..."
- Tabs Sales, Events e Settings nao aparecem (porque nao ha `templateId` na BD)

Ou seja, os templates estaticos ficam inuteis no manager -- nao se consegue configurar tracking, dominio, pixels, nem ver vendas.

## Solucao

Quando o utilizador abre um template estatico para gestao, o sistema cria automaticamente um registo na tabela `vertical_templates` com os dados do ficheiro estatico. A partir dai, o template passa a ter um ID na BD e todas as tabs ficam disponiveis.

## Alteracoes

### 1. `src/components/funnels/VerticalFunnelManager.tsx`

- Ao detectar que e um template estatico (tem `slug` mas nao `templateId`):
  1. Verificar se ja existe um registo na BD com esse slug (pode ter sido criado anteriormente)
  2. Se nao existir, criar automaticamente um registo em `vertical_templates` com os dados do `verticalConfigs`
  3. Usar o ID resultante como `resolvedId` para todas as tabs
- Adicionar um hook `useEnsureVerticalTemplateInDB(slug, staticConfig, workspaceId)` que:
  - Faz query por slug na BD
  - Se encontrar, retorna o ID
  - Se nao encontrar, insere o registo e retorna o novo ID
- Com o ID resolvido, todas as 5 tabs (Conteudo, Stats, Sales, Events, Settings) ficam disponiveis
- O tab Conteudo passa a renderizar o `VerticalTemplateBuilder` com o ID (permitindo edicao)

### 2. Novo hook em `src/hooks/useVerticalTemplates.ts`

Adicionar `useEnsureVerticalTemplate(slug)`:
- Query: procura na BD um template com o slug dado e o workspace_id actual
- Se encontrar, retorna o registo
- Se nao encontrar, usa mutation para inserir com os dados do `verticalConfigs[slug]` e retorna o novo registo
- Marca `is_published: true` por defeito (ja que o template estatico esta publicado)

### 3. Sem alteracoes de base de dados

A tabela `vertical_templates` ja tem todos os campos necessarios. Apenas se vai inserir dados nela automaticamente.

## Resultado

- Clicar "Editar" em qualquer template (estatico ou custom) abre o manager completo com as 5 tabs
- O template estatico e auto-provisionado na BD na primeira vez que e aberto
- A partir dai, o utilizador pode configurar dominio, tracking codes, pixels Meta e ver vendas
- O conteudo AIDA tambem fica editavel
