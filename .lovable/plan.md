
# Bio OS -- Imagens: Upload Manual + Geracao por IA

## Objectivo
Adicionar ao editor de blocos Bio a possibilidade de:
1. **Fazer upload manual** de imagens (para fundos de blocos Hero/Feature e para o bloco Imagem)
2. **Gerar imagens por IA** com um prompt descritivo, usando o modelo Gemini para criacao de imagens

## Arquitectura

### Storage
- Criar um novo bucket `bio-assets` (publico) para guardar as imagens dos blocos Bio
- RLS policy para permitir upload por utilizadores autenticados e leitura publica

### Edge Function: `bio-generate-image`
Nova edge function que:
- Recebe um `prompt` e `workspaceId`
- Usa o modelo `google/gemini-2.5-flash-image` via Lovable AI gateway para gerar a imagem
- Faz upload do resultado para o bucket `bio-assets`
- Retorna a URL publica da imagem
- Segue o mesmo padrao ja usado em `generate-community-banner`

### Frontend: Componente `BioImageUploader`
Novo componente reutilizavel (`src/components/bio/BioImageUploader.tsx`) que oferece duas opcoes:
- **Tab "Upload"**: Input de ficheiro com drag-and-drop, preview da imagem, upload directo para o bucket `bio-assets`
- **Tab "Gerar com IA"**: Campo de texto para prompt, botao "Gerar", loading state com mensagem rotativa, preview do resultado

### Integracao no Editor
- No `BlockProperties` (dentro de `BioBlockEditor.tsx`), substituir o campo de texto "Imagem de fundo (URL)" por um botao "Escolher Imagem" que abre o `BioImageUploader`
- Aplicar ao bloco `hero`, `feature` (campo `bg_image`) e ao bloco `image` (campo `url`)
- Quando o utilizador faz upload ou gera uma imagem, o URL publico e guardado automaticamente no content do bloco

---

## Detalhes Tecnicos

### Ficheiros a criar:
1. **`supabase/functions/bio-generate-image/index.ts`** -- Edge function para gerar imagens por IA
   - Usa `LOVABLE_API_KEY` (ja configurado)
   - Modelo: `google/gemini-2.5-flash-image`
   - Upload para bucket `bio-assets` com path `{workspaceId}/bio-{timestamp}.{ext}`
   - Retorna `{ success: true, url: string }`

2. **`src/components/bio/BioImageUploader.tsx`** -- Componente de upload/geracao
   - Dialog/Popover com duas tabs (Tabs do Radix)
   - Tab Upload: input file aceita `image/*`, preview, upload via `supabase.storage.from("bio-assets")`
   - Tab IA: textarea para prompt, botao gerar, invoca `supabase.functions.invoke("bio-generate-image")`
   - Prop `onImageSelected(url: string)` -- callback quando imagem esta pronta
   - Prop `workspaceId: string`

### Ficheiros a editar:
1. **`src/components/bio/BioBlockEditor.tsx`**
   - Importar `BioImageUploader`
   - Nos blocos `hero`/`feature`: substituir Input de `bg_image` por botao + `BioImageUploader`
   - No bloco `image`: substituir Input de `url` por botao + `BioImageUploader`
   - Mostrar preview da imagem actual se existir

### Migracao SQL:
- Criar bucket `bio-assets` (publico)
- Criar policies de storage para upload autenticado e leitura publica

### Sem alteracoes ao schema de tabelas
O campo `content` (JSONB) dos `bio_blocks` ja suporta guardar URLs de imagem.
