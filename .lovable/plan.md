

# Corrigir Incompatibilidades de Campos nos Templates Premium

## Problema Principal

Os templates tem conteudo rico, mas os renderers da pagina publica (`PublicBioPage.tsx`) esperam campos com nomes diferentes dos que os templates enviam. Resultado: blocos ficam vazios ou nao aparecem.

## Incompatibilidades Detectadas

| Bloco | Template envia | Renderer espera | Resultado |
|---|---|---|---|
| **Testimonials** | `{ text, author }` (campos simples) | `{ items: [{ text, author }] }` (array) | Testemunhos vazios |
| **FAQ** | `{ question, answer }` (campo unico) | `{ items: [{ question, answer }] }` (array) | FAQ vazio |
| **Feature** | `subtitle` | `description` | Descricao nao aparece |
| **Social** | `{ links: [{ platform, url }] }` (array) | `content.instagram`, `content.facebook` (campos directos) | Icones nao aparecem |

## Solucao

Corrigir os **templates** para usar os formatos que os renderers ja esperam, E actualizar os **renderers** para suportar ambos os formatos (retrocompatibilidade).

### Ficheiro 1: `src/components/bio/BioTemplateGallery.tsx`

Corrigir os campos de todos os 12 templates:

- **Testimonials**: mudar de `{ text, author }` para `{ items: [{ text, author }] }` -- agrupar os 3 testemunhos num so bloco com array `items`
- **FAQ**: mudar de `{ question, answer }` para `{ items: [{ question, answer }] }` -- ou agrupar multiplas FAQs num bloco
- **Feature**: mudar `subtitle` para `description` (campo que o renderer le)
- **Social**: mudar de `{ links: [] }` para `{ instagram: "url", facebook: "url", ... }` (campos directos por plataforma)

### Ficheiro 2: `src/pages/PublicBioPage.tsx`

Actualizar renderers para suportar ambos os formatos (templates novos + blocos criados manualmente):

- **TestimonialsBlock**: se `items` nao existir, usar `[{ text: content.text, author: content.author }]`
- **FAQBlock**: se `items` nao existir, usar `[{ question: content.question, answer: content.answer }]`
- **FeatureBlock**: ler `description || subtitle` para retrocompatibilidade
- **SocialBlock**: suportar tanto `content.instagram` como `content.links[]`

### Ficheiro 3: `src/components/bio/BioBlockPreviewCard.tsx`

Actualizar previews para consistencia:

- **FAQ preview**: mostrar as perguntas do array `items` em vez de apenas o label "FAQ"
- **Feature preview**: garantir que le `description || subtitle`
- **Social preview**: mostrar icones das plataformas configuradas

## Ficheiros a modificar

| Ficheiro | Accao |
|---|---|
| `src/components/bio/BioTemplateGallery.tsx` | Corrigir nomes dos campos em todos os 12 templates |
| `src/pages/PublicBioPage.tsx` | Actualizar renderers para suportar ambos formatos |
| `src/components/bio/BioBlockPreviewCard.tsx` | Melhorar previews de FAQ, Feature e Social |

## Resultado esperado

- Todos os blocos dos templates aparecem com conteudo completo na pagina publica
- Testemunhos com texto, autor e estrelas visiveis
- FAQs com perguntas expandiveis
- Features com descricoes e CTAs
- Redes sociais com icones clicaveis
- Retrocompatibilidade com blocos criados manualmente

