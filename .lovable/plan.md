

# Enriquecer Visual das Páginas Estruturais do eBook

## Diagnóstico

As páginas estruturais geradas por `templateToChapters.ts` (capa, copyright, índice, CTA, agradecimento, etc.) são HTML inline genérico sem qualquer ligação visual ao template escolhido. Usam estilos hardcoded (`style="padding:3rem"`) sem cores, fontes ou elementos decorativos do template. No `FlipbookReader`, são renderizadas como páginas de conteúdo comuns — perdem toda a identidade visual.

**Problemas concretos:**
- Páginas estruturais não usam as cores do template (`--ebook-primary`, `--ebook-accent`, etc.)
- Sem gradientes, separadores, ornamentos ou hierarquia visual
- A capa gerada pelo template compete com a capa default do `buildPages` (duplica)
- Páginas como CTA, Agradecimento e Sobre o Autor são texto puro sem design
- Nenhuma página estrutural tem layout diferenciado (tudo é bloco de texto corrido)

## Plano

### 1. Reescrever HTML das páginas estruturais com CSS variables (`templateToChapters.ts`)

Cada gerador em `STRUCTURAL_CONTENT` passa a produzir HTML rico que usa as CSS variables do template (`var(--ebook-primary)`, `var(--ebook-accent)`, etc.):

- **Capa**: fundo com gradiente da cor primária, título grande centrado, linhas decorativas, subtítulo e autor com tipografia do template
- **Copyright**: layout discreto com separador, texto reduzido, ornamento
- **Índice**: numeração estilizada com cor accent, linhas pontilhadas, hierarquia clara
- **Carta de Boas-Vindas**: aspas decorativas, assinatura estilizada
- **Citação**: fundo com gradiente accent, aspas grandes, texto centrado
- **Estatísticas**: cards com números grandes em cor accent, ícones decorativos
- **Testemunho**: card com borda accent, avatar placeholder, citação estilizada
- **Timeline**: pontos circulares coloridos, linhas de ligação, badges de fase
- **CTA**: botão estilizado com cor accent, fundo gradiente, ícones de contacto
- **Sobre o Autor**: layout com avatar placeholder, bio formatada, redes sociais
- **Agradecimento**: ornamento central, tipografia elegante, assinatura

### 2. Eliminar duplicação de capa no `FlipbookReader.tsx`

O `buildPages` actualmente adiciona sempre uma capa default. Quando o template inclui `cover_hero_image` ou `cover_split`, há duplicação. Corrigir:
- Se o primeiro capítulo tem `layout_key` de capa, não criar a capa default
- A capa do template passa a ser renderizada como a capa principal

### 3. Renderizar páginas estruturais com layout dedicado no `FlipbookPage.tsx`

Actualmente as páginas estruturais passam pelo renderer de conteúdo genérico. Adicionar CSS scoped específico para as classes das páginas estruturais:
- `.ebook-cover-page` — ocupar página inteira, centrar
- `.ebook-structural-page` — classe base com padding e tipografia adequados
- Garantir que as CSS variables do template são respeitadas dentro do HTML inline

### 4. Passar `style_tokens` como variáveis no HTML gerado

O `buildChaptersFromTemplate` recebe o template com `style_tokens`. Injectar as cores directamente no HTML das páginas estruturais como fallback (para quando as CSS variables não estão disponíveis), mas usar `var(--ebook-*)` como método principal.

## Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/utils/templateToChapters.ts` | Reescrever todos os geradores com HTML visualmente rico |
| `src/components/ebooks/FlipbookReader.tsx` | Evitar capa duplicada quando template inclui capa |
| `src/components/ebooks/FlipbookPage.tsx` | Adicionar CSS scoped para páginas estruturais |

## Critérios de Aceitação

- Todas as páginas estruturais usam cores e fontes do template
- Cada tipo de página tem layout visual distinto e profissional
- Sem duplicação de capa
- Elementos decorativos (gradientes, separadores, ornamentos) presentes
- Visual coerente entre páginas estruturais e de conteúdo

