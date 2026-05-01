# Mapeamento de campos do produto — SSoT

Este documento é a fonte canónica para evitar duplicação entre as colunas
da tabela `products` e os atributos do `product_content_sections.attributes`.

## Princípios
1. **Uma fonte de verdade por atributo.** Quando existe coluna dedicada na `products`,
   essa coluna é o SSoT — o atributo da secção é apenas um espelho derivado.
2. **O Copilot B2B lê sempre a vista unificada** via RPC `get_product_full_content`,
   que funde colunas SSoT nos atributos da secção correspondente.
3. **O editor de secções esconde os campos espelhados** (geridos por `MIRRORED_KEYS`
   em `src/components/products/sections/sectionFieldsSchema.ts`).

## Mapeamento canónico

| Atributo (chave em `attributes`) | Secção | Coluna SSoT em `products` | Transform |
|---|---|---|---|
| `frequencia` | `how_to_use` | `recommended_frequency` | — |
| `dose` | `how_to_use` | `included_quantity` + `unit_name` | `quantity_unit` |
| `peso` | `specifications` | `weight` | `weight_kg` |
| `volume` | `specifications` | `total_units` + `unit_name` | `quantity_unit` |
| `validade` | `specifications` | `validity_days` | `validity_days` |

## Atributos que vivem só nas secções (não há coluna dedicada)

### overview
`indicacao`, `contraindicacao`, `publico_alvo`

### how_to_use
`passos`, `advertencias`

### specifications
`ingredientes_chave`, `inci`, `ph`, `certificacoes`, `dimensoes`

### clinical
`mecanismo_accao`, `activos`, `alvo_terapeutico`, `evidencia`, `referencias`,
`protocolos`, `indicacoes_clinicas`, `contraindicacoes`, `advertencias`,
`precaucoes`, `interaccoes`, `efeitos_adversos`, `tempo_resultados`

## Migrações já feitas

| Coluna antiga | Destino |
|---|---|
| `commercial_description` | secção `overview.body_markdown` |
| `specifications` (jsonb) | secção `specifications.attributes` |
| `conditions` | secção `clinical.body_markdown` |

As colunas antigas continuam a existir na tabela (compatibilidade), mas o UI novo
deixa de as escrever — devem ser removidas em sprint futuro de cleanup.

## Como adicionar um novo atributo

1. Se já existe coluna na `products` com semântica equivalente → adicionar entrada
   em `CANONICAL_COLUMN_MAP` (NÃO criar campo no editor).
2. Se não existe coluna e é um atributo livre → adicionar a `SECTION_FIELDS[seccao]`.
3. Se é um atributo crítico para queries SQL/agregações → criar coluna dedicada
   e mapeá-la em `CANONICAL_COLUMN_MAP`.
