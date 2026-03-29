

# Enriquecer os 9 Templates de eBooks

## Contexto
Os 9 templates já existem na BD com metadata, style_tokens e page_layouts básicos. No entanto, o `default_content` é mínimo — faltam conteúdos ricos para cada bloco (chapters no índice, textos de quote, stats, timeline, testimonials, etc.) e alguns layouts precisam de ajuste para corresponder à descrição detalhada de cada template.

## O que será feito

### 1. Atualizar `default_content` de cada template (via SQL UPDATE)
Cada template receberá conteúdo completo para **todos os blocos** do seu layout:

| Template | Conteúdo a adicionar |
|---|---|
| **Minimal Clean 01** | chapters (6 itens no TOC), welcomeText editorial, quoteText/quoteAuthor, 4 stats, ctaHeading/Description, authorBio, thankYouText, disclaimerText |
| **Minimal Clean 02** | chapters (5 itens), chapterTitle/Description, quoteText, testimonial, ctaHeading |
| **Minimal Soft Editorial** | chapters (6 itens), welcomeText lifestyle, timeline (4 etapas), 3 column highlights, quoteText poético |
| **Editorial Red Black** | chapters (5 itens), stats impactantes, quoteText bold, testimonial forte, heading textos |
| **Modern Magazine** | chapters (6 itens), timeline editorial, stats marketing, 3 column highlights, heading storytelling |
| **Impact Story Layout** | chapters (5 itens), stats narrativa, quoteText marca, testimonial autoridade, disclaimerText |
| **Brand Strategy Black Gold** | chapters (7 itens estratégia), timeline brand, stats posicionamento, 3 col highlights, welcomeText corporate |
| **Premium Report White Gold** | chapters (6 itens relatório), stats KPIs, timeline projeto, testimonial cliente, quoteText dados |
| **Corporate Playbook Clean Dark** | chapters (7 itens playbook), timeline implementação, stats operacionais, quoteText liderança |

### 2. Ajustar `page_layouts` específicos
Alguns templates precisam de layouts mais diferenciados conforme a descrição:
- **Minimal Clean 01**: adicionar `disclaimer_clean` (pedido na spec)
- **Editorial Red Black**: manter sem welcome_letter (estilo direto/impactante)
- **Brand Strategy Black Gold**: layout mais longo (15 páginas) com mais blocos de conteúdo

### 3. Execução
- 9 queries UPDATE via insert tool (uma por template, usando o `id` UUID já conhecido)
- Não há alteração de schema — apenas dados
- O `BlockRenderer` já renderiza todos os campos (`quoteText`, `chapters`, `stat0-3`, `label0-3`, `date0-3`, `event0-3`, etc.)
- A galeria e o preview modal já funcionam com estes dados

### Resultado esperado
Ao abrir `/dashboard/ebooks/templates`, cada template mostrará um preview navegável rico com conteúdos reais em todas as páginas, sem campos vazios.

