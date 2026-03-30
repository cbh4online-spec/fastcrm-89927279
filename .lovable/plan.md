

# Criação de eBook não respeita o template — Diagnóstico e Plano

## Diagnóstico

O problema é claro: quando o utilizador selecciona um template no Wizard, **apenas os `style_tokens` são guardados** como `global_styles` (cores e fontes). O template contém mais dois campos cruciais que são **completamente ignorados**:

1. **`page_layouts`** — a sequência de blocos/páginas do template (capa, copyright, índice, capítulos, CTA, agradecimento, etc.)
2. **`default_content`** — o conteúdo pré-definido do template (textos de exemplo, placeholders como `{{book_title}}`, `{{author_name}}`)

O wizard gera capítulos via IA sem considerar a estrutura do template. O resultado é um eBook com as fontes/cores do template mas sem a sua estrutura visual.

## Plano de Implementação

### 1. Actualizar `EbookWizard.tsx` — aplicar estrutura do template

Quando um template é seleccionado, após criar o eBook:

- **Gerar capítulos estruturais a partir do `page_layouts`**: converter cada `LayoutKey` do template num capítulo ou bloco especial. Por exemplo:
  - `cover_hero_image` → capítulo "Capa" com conteúdo do `default_content` (título, subtítulo, imagem)
  - `copyright_simple` → capítulo "Copyright" com texto de copyright
  - `table_of_contents_split` → capítulo "Índice" (gerado automaticamente)
  - `welcome_letter` → capítulo "Carta de Boas-Vindas"
  - `chapter_intro_large/minimal` → capítulo de conteúdo (aqui encaixam os capítulos gerados pela IA)
  - `cta_page`, `author_section`, `thank_you_page` → capítulos finais com default_content

- **Mesclar capítulos IA com estrutura template**: os capítulos gerados pela IA preenchem os slots `chapter_intro_*` / `rich_text` do template. Os capítulos estruturais (capa, copyright, CTA, etc.) são adicionados nas posições correctas.

- **Resolver placeholders**: aplicar `resolvePlaceholders()` do `ebook-templates.ts` nos conteúdos, substituindo `{{book_title}}`, `{{author_name}}` etc. pelos dados reais do eBook.

### 2. Criar função `buildChaptersFromTemplate()` (novo helper)

Ficheiro: `src/components/ebooks/utils/templateToChapters.ts`

```text
buildChaptersFromTemplate(
  template: EbookTemplate,
  aiChapters: EbookChapter[],
  ebookData: { title, subtitle, authorName }
) → EbookChapter[]
```

Lógica:
- Percorrer `template.page_layouts` em ordem
- Para cada layout key, criar um capítulo com:
  - Título derivado do `LAYOUT_LABELS[key]`
  - Conteúdo do `default_content` com placeholders resolvidos
  - Se for `chapter_intro_*` ou `rich_text`, consumir o próximo capítulo IA da lista
- Devolver a lista completa de capítulos na ordem do template

### 3. Actualizar `EbookWizard.tsx` — integrar builder

No `handleGenerate`, após gerar os capítulos IA:
- Se `selectedTemplate` existe, chamar `buildChaptersFromTemplate()` em vez de usar os capítulos IA directamente
- Os capítulos resultantes incluem tanto a estrutura do template como o conteúdo gerado

### 4. Actualizar `FlipbookReader.tsx` — renderizar blocos de template

Os capítulos estruturais (capa, copyright, CTA) contêm conteúdo HTML específico do template. O `FlipbookReader` já renderiza HTML, mas os blocos do template usam `BlockRenderer`. Precisamos:
- Detectar capítulos com `layout_key` metadata
- Renderizá-los usando o `BlockRenderer` existente em vez de HTML genérico

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/utils/templateToChapters.ts` | **Novo** — função `buildChaptersFromTemplate()` |
| `src/components/ebooks/EbookWizard.tsx` | Integrar builder de capítulos quando template seleccionado |
| `src/hooks/useEbooks.ts` | Adicionar `layout_key` opcional ao `EbookChapter` |
| `src/components/ebooks/FlipbookReader.tsx` | Suporte para renderizar capítulos com `layout_key` via `BlockRenderer` |

## Critérios de Aceitação

- Seleccionar template → eBook criado com a estrutura completa do template (capa, copyright, índice, capítulos, CTA, agradecimento)
- Conteúdo default do template é usado com placeholders resolvidos (título real, nome do autor)
- Capítulos gerados pela IA são inseridos nos slots correctos da estrutura
- Estilos visuais (cores, fontes) continuam a ser aplicados
- Criação "Sem template" mantém o comportamento actual

