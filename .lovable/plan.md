

# Wizard não adapta estrutura ao template seleccionado

## Diagnóstico

O `buildChaptersFromTemplate` já existe e funciona, mas o wizard ignora a estrutura do template na UI:

1. **Step 2 (Estrutura)** permite escolher `chapterCount` livremente — deveria auto-ajustar ao número de slots de conteúdo do template (`chapter_intro_*`, `rich_text`, `text_image_split`, `three_column_highlights`)
2. Se o utilizador pede 7 capítulos mas o template só tem 3 slots de conteúdo, 4 capítulos ficam "soltos" fora da estrutura
3. Não há feedback visual sobre o que o template inclui (capa, copyright, índice, CTA, etc.)

## Plano

### 1. Adaptar Step 2 quando template está seleccionado

Quando `selectedTemplate` existe com `page_layouts`:

- Calcular automaticamente o número de content slots do template (layouts em `CONTENT_LAYOUT_KEYS`)
- Definir `chapterCount` = número de content slots (e bloquear o selector ou mostrar como informativo)
- Mostrar resumo visual da estrutura do template: lista das páginas que serão criadas (ex: "Capa → Copyright → Índice → 5 Capítulos → CTA → Agradecimento")
- Permitir override do número de capítulos se o utilizador quiser, mas avisar que capítulos extra serão adicionados fora da estrutura do template

### 2. Sincronizar `chapterCount` ao seleccionar template (Step 0)

No `onSelect` do `TemplatePickerStep`, quando um template é escolhido:
- Contar content slots e fazer `setChapterCount(contentSlotCount)`
- Quando "Sem template" é escolhido, restaurar o `chapterCount` anterior

### 3. Mostrar preview da estrutura no Step 2

Componente inline que mostra a sequência de páginas do template com ícones:
- Páginas estruturais (capa, copyright, índice, CTA, etc.) com badge "automático"
- Slots de conteúdo com badge "IA"
- Total de páginas estimado

## Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/EbookWizard.tsx` | Sincronizar `chapterCount` com template; adaptar Step 2 UI |
| `src/components/ebooks/utils/templateToChapters.ts` | Exportar `CONTENT_LAYOUT_KEYS` e helper `countContentSlots()` |

## Critérios de Aceitação

- Seleccionar template → `chapterCount` auto-ajusta aos content slots
- Step 2 mostra resumo visual da estrutura do template
- eBook gerado respeita a sequência de páginas do template
- "Sem template" mantém comportamento actual

