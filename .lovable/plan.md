

# Builder de Templates Verticais AIDA

## Objetivo

Criar um builder visual que permite criar novos templates verticais AIDA para qualquer area de negocio, guardando-os na base de dados. Isto permite escalar para alem dos 6 templates estaticos actuais (clinicas, imobiliarias, formacao, condominios, agencias, empresas).

## Como funciona

Na pagina de Landing Pages, ao lado do botao "New Page", aparecera um botao "+ Novo Template AIDA". Ao clicar, abre um builder multi-step que guia o utilizador a preencher todos os campos do template (nome, slug, dores, modulos, cores, CTAs, SEO, etc.). O template e guardado na base de dados e fica imediatamente disponivel como pagina publica.

## Plano Tecnico

### 1. Tabela na base de dados: `vertical_templates`

Nova tabela para guardar templates verticais criados pelo utilizador:

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid (PK) | Identificador unico |
| workspace_id | uuid (FK) | Workspace do criador |
| slug | text (unique) | URL slug (ex: "restaurantes") |
| nome | text | Nome da vertical |
| dor_principal | text | Dor principal do publico-alvo |
| resultado_prometido | text | Resultado prometido |
| dores | jsonb | Array de 4 dores |
| modulos_ativos | jsonb | Array de modulos com nome, desc, icon |
| antes_depois | jsonb | Objecto com arrays antes/depois |
| roi_exemplo | jsonb | Objecto com clientes_extra, valor_medio, periodo |
| cores | jsonb | Objecto com primaria e accent |
| cta_principal | text | Texto do CTA principal |
| cta_secundario | text | Texto do CTA secundario |
| ai_persona_nome | text | Nome da persona AI |
| seo | jsonb | Objecto com title, description, canonical |
| is_published | boolean | Se esta publicado |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de actualizacao |
| created_by | uuid | User que criou |

RLS: Membros do workspace podem ler; admins/owners podem criar/editar/apagar.

### 2. Componente: `VerticalTemplateBuilder.tsx`

Builder com tabs para organizar os campos:

- **Tab "Identidade"**: Nome, slug (auto-gerado), dor principal, resultado prometido
- **Tab "Dores"**: 4 campos de texto para as dores do publico
- **Tab "Solucao"**: Modulos ativos (nome, descricao, icone) -- ate 6 modulos com add/remove
- **Tab "Transformacao"**: Antes/Depois (4 itens cada)
- **Tab "ROI"**: Clientes extra, valor medio, periodo
- **Tab "Aparencia"**: Cores primaria e accent com color picker
- **Tab "CTAs & SEO"**: CTA principal, CTA secundario, SEO title, description

Cada tab tem um botao "Gerar com IA" que usa o Lovable AI para sugerir conteudo baseado no nome da vertical e area de negocio.

Botoes no topo: Voltar, Preview, Guardar, Publicar.

### 3. Preview

Reutiliza o componente `VerticalLandingTemplate` existente, passando os dados do formulario convertidos para o formato `VerticalConfig`.

### 4. Rota dinamica

Actualizar o `App.tsx` para suportar templates dinamicos da base de dados: adicionar uma rota catch-all `/:slug` que verifica primeiro os configs estaticos e depois a tabela `vertical_templates`.

### 5. Integracao na Landing Pages List

- Botao "+ Novo Template AIDA" no header
- Templates da BD aparecem na mesma grelha dos templates estaticos, com badges "AIDA" e "Custom"
- Botoes: Abrir, Editar, Eliminar (para os da BD)

### 6. Hook: `useVerticalTemplates.ts`

Hook React Query para CRUD dos templates:
- `useVerticalTemplates()` -- lista todos do workspace
- `useVerticalTemplate(id)` -- busca um por ID
- `useCreateVerticalTemplate()` -- criar
- `useUpdateVerticalTemplate()` -- actualizar
- `useDeleteVerticalTemplate()` -- eliminar

### Ficheiros a criar

- `src/components/landing-pages/VerticalTemplateBuilder.tsx` -- Builder principal
- `src/hooks/useVerticalTemplates.ts` -- Hook CRUD
- Migracao SQL para tabela `vertical_templates`

### Ficheiros a editar

- `src/components/landing-pages/LandingPagesList.tsx` -- Adicionar botao, listar templates da BD
- `src/pages/VerticalLandingPage.tsx` -- Fallback para templates da BD
- `src/App.tsx` -- Rota dinamica para novos slugs

