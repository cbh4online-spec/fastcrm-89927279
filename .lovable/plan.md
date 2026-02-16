

# Bio OS -- Smart Link: IA gera tudo a partir de um URL

## Conceito
Em vez de editar campo a campo, o utilizador cola um URL e a IA analisa o destino para gerar automaticamente:
- **Titulo** chamativo (tecnicas AIDA/PAS)
- **Subtitulo** persuasivo
- **Texto do CTA** optimizado para cliques
- **Imagem** gerada por IA que combine com o conteudo

Isto resolve dois problemas de uma vez:
1. Elimina a edicao manual campo a campo (que tem o bug de debounce)
2. Cria blocos de alta qualidade com zero esforco

## Fluxo do Utilizador

```text
1. Utilizador adiciona bloco (hero, feature, link, button)
2. No painel de propriedades, ve um campo "URL da pagina"
3. Cola o URL (ex: https://meusite.pt/produto)
4. Clica "Gerar com IA"
5. Loading com mensagens rotativas (5-8 seg)
6. Todos os campos preenchidos automaticamente:
   - Titulo, subtitulo, CTA text (copy persuasivo)
   - Imagem de fundo gerada (para hero/feature)
7. Utilizador pode ajustar qualquer campo depois
```

## Mudancas Tecnicas

### 1. Nova Edge Function: `bio-smart-link`
Recebe um URL e tipo de bloco, faz duas coisas:
- Usa Gemini 3 Flash para gerar copy persuasivo (titulo, subtitulo, CTA) baseado no URL
- Usa Gemini 2.5 Flash Image para gerar uma imagem de fundo tematica
- Retorna tudo num unico objecto

A funcao faz fetch do URL para extrair meta tags (title, description, og:image) como contexto para a IA gerar copy mais relevante.

### 2. Corrigir edicao: Debounced inputs
Criar componentes `DebouncedInput` e `DebouncedTextarea` para resolver o bug actual onde cada tecla dispara um update ao servidor. Usam estado local + timer de 500ms.

### 3. Novo componente: `BioSmartLinkGenerator`
Componente inline no painel de propriedades com:
- Input para colar o URL
- Botao "Gerar com IA" com icone Sparkles
- Loading state com mensagens rotativas
- Preenche todos os campos do bloco de uma vez via callback

### 4. Actualizar `BioBlockEditor.tsx`
- Substituir todos os inputs por versoes debounced
- Adicionar o `BioSmartLinkGenerator` no topo do painel de propriedades dos blocos hero, feature, link e button
- Quando a IA gera o conteudo, fazer um unico `updateBlock.mutate()` com todos os campos

### Ficheiros a criar:
- `supabase/functions/bio-smart-link/index.ts` -- Edge function que analisa URL e gera copy + imagem
- `src/components/bio/BioSmartLinkGenerator.tsx` -- Componente de geracao por URL

### Ficheiros a editar:
- `src/components/bio/BioBlockEditor.tsx` -- Integrar smart link generator + debounced inputs

### Logica da Edge Function:

```text
Input: { url, blockType, workspaceId }

1. Fetch URL -> extrair <title>, <meta description>, <meta og:image>
2. Gemini 3 Flash (tool calling):
   - Gera: title, subtitle, cta_text
   - Tecnicas: AIDA, urgencia, beneficio, prova social
3. Se blockType = hero ou feature:
   - Gemini 2.5 Flash Image: gerar imagem tematica
   - Upload para bucket bio-assets
4. Retorna: { title, subtitle, cta_text, bg_image? }
```

### Sem alteracoes de schema
O campo `content` JSONB ja suporta todos os campos necessarios.

