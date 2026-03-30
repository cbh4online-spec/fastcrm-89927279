

# Geração de Imagens não respeita configuração por tipo de página

## Diagnóstico

O loop de geração de imagens no `EbookWizard.tsx` (linhas 273-305) tem três problemas:

1. **Gera imagens para TODOS os capítulos** — incluindo páginas estruturais (Copyright, Disclaimer, TOC, etc.) que não devem ter imagens geradas
2. **Usa apenas `imageLayout.chapter`** para tudo — ignora completamente as configurações de `content`, `cta` e `cover` definidas pelo utilizador
3. **Não respeita `count: 0`** por tipo — se o utilizador definir "Nenhuma" imagem para conteúdo, continua a gerar

Adicionalmente, as opções de configuração são limitadas: faltam presets de aspecto, opção de estilo por tipo de página, e preview visual do que será gerado.

## Plano

### 1. Corrigir loop de geração de imagens (`EbookWizard.tsx`)

Separar a geração por tipo de página:

- **Classificar cada capítulo** como `cover`, `chapter`, `content` ou `cta` com base no `layout_key`
- **Para cada tipo**, usar a configuração correspondente de `imageLayout` (count, size, position)
- **Saltar** capítulos estruturais sem imagem (copyright, disclaimer, TOC, etc.)
- **Gerar múltiplas imagens** se `count > 1` para um tipo
- **Ajustar o prompt** de IA com hints de size/position correcto por tipo

Mapeamento `layout_key` → tipo de imagem:
- `cover_hero_image`, `cover_split` → `cover`
- `chapter_intro_large`, `chapter_intro_minimal` → `chapter`
- `rich_text`, `text_image_split`, `three_column_highlights` → `content`
- `cta_page`, `author_section`, `thank_you_page` → `cta`
- Restantes (copyright, disclaimer, TOC, welcome, quote, stats, testimonial, timeline) → sem imagem

### 2. Enriquecer opções do `EbookImageLayoutConfig`

Adicionar ao painel de configuração por tipo de página:

- **Estilo de aspecto visual** — presets rápidos: "Paisagem 16:9", "Retrato 3:4", "Quadrado 1:1", "Banner largo"
- **Opção de prompt personalizado** por tipo — campo de texto opcional para instruções específicas (ex: "usar tons azuis para capítulos")
- **Contagem até 3** (actualmente max 2) para páginas de conteúdo
- **Preview visual** compacto do layout (mini-diagrama mostrando posição da imagem na página)
- **Toggle "Imagem de fundo"** — para capas e CTAs, opção de usar imagem como fundo vs. inserida

### 3. Actualizar cálculo de créditos

O custo estimado de imagens deve reflectir a configuração real:
- Somar `imageLayout[tipo].count` × número de capítulos desse tipo
- Mostrar breakdown no resumo de custos

### 4. Integrar imagens geradas nas páginas estruturais

Para capas e CTAs com imagens geradas:
- Inserir a URL da imagem no HTML estrutural (o template já tem placeholders visuais)
- Usar `imagePosition` para ajustar layout (fundo vs. inline)

## Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/EbookWizard.tsx` | Refactorizar loop de imagens para respeitar config por tipo; corrigir cálculo de créditos |
| `src/components/ebooks/EbookImageLayoutConfig.tsx` | Adicionar presets de aspecto, prompt personalizado, preview mini-layout, toggle fundo, count até 3 |
| `src/components/ebooks/utils/templateToChapters.ts` | Adicionar helper `getPageImageType()` para classificar layout_key → tipo de imagem |

## Critérios de Aceitação

- Imagens geradas apenas para tipos de página com `count > 0`
- Size/position correctos por tipo (cover usa config cover, content usa config content)
- Páginas estruturais sem imagem (copyright, disclaimer, etc.) não gastam créditos
- Custo estimado reflecte configuração real
- UI oferece mais controlo: aspecto, prompt custom, preview visual
- Configuração "Sem imagem" (count=0) é respeitada por tipo

