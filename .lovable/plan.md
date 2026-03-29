

# Inserir imagens reais no conteúdo dos capítulos

## Problema

O botão "Imagem" na toolbar lateral insere apenas um placeholder com texto "Clique duas vezes para adicionar URL da imagem" — nunca insere uma imagem real. Não há mecanismo para fazer upload de uma imagem inline no conteúdo.

## Solução

### 1. `EbookBlockToolbar.tsx` — Botão de imagem com upload

Substituir o bloco placeholder por um botão que abre um `<input type="file">` oculto. Ao seleccionar ficheiro:
- Faz upload via `uploadEbookImage` (já existe)
- Insere `<img src="URL" alt="imagem" style="max-width:100%;border-radius:8px;margin:12px 0" />` no editor via `onInsertBlock`

O componente precisa receber uma nova prop `onInsertImage` (callback que recebe `File` e devolve `Promise<string|null>` com a URL).

### 2. `EbookEditor.tsx` — Passar handler de upload

Criar uma função `handleInlineImageUpload` que:
- Recebe o `File`
- Faz upload com `uploadEbookImage(file, \`inline/${ebookId}\`)`
- Devolve a URL pública

Passar esta função ao `EbookBlockToolbar` como prop `onUploadImage`.

### 3. `EbookBlockToolbar.tsx` — Adicionar botão "Gerar Imagem IA"

Adicionar um segundo item no grupo "Média" para gerar imagem via IA (usando o edge function `ebook-ai-assist` com action `generate_image`). Insere a imagem gerada directamente no conteúdo.

### Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `EbookBlockToolbar.tsx` | Novo prop `onUploadImage`, botão imagem abre file picker, insere `<img>` real |
| `EbookEditor.tsx` | Criar `handleInlineImageUpload`, passar ao toolbar |

