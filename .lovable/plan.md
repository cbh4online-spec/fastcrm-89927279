

# Imagens no texto, cabeçalho/rodapé personalizáveis e página final de contactos

## O que muda

### 1. Base de dados — novos campos na tabela `ebooks`

Adicionar colunas ao JSON `metadata` (ou como colunas directas) para guardar configuração de cabeçalho, rodapé e página de contactos:

```sql
ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS header_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_page jsonb DEFAULT '{}';
```

O `contact_page` guarda: `email`, `phone`, `website`, `slogan`, `social_links` (array), `logo_url`.

### 2. Imagens ao longo do texto

O conteúdo em Markdown já suporta `![alt](url)` e o `FlipbookPage` já renderiza imagens com `figure`/`figcaption`. O que falta:

- **`FlipbookReader.tsx`** — ajustar `splitContentIntoPages` para detectar linhas de imagem (`![...](...)`), contar como ~400 chars (espaço visual que uma imagem ocupa), evitando que uma página com imagem tenha excesso de texto.
- **`EbookEditor.tsx`** — já tem botão de upload de imagem; garantir que insere `![legenda](url)` no conteúdo do capítulo via o `EbookRichEditor`.

### 3. Cabeçalho e rodapé personalizáveis

**`FlipbookPage.tsx`**:
- Receber props `headerText` e `footerText` (passados desde o `FlipbookReader`)
- No header das páginas de conteúdo: mostrar `headerText` se definido, senão manter o título do capítulo actual
- No footer: mostrar `footerText` se definido (ex: nome da empresa, website), com o número de página

**`FlipbookReader.tsx`**:
- Receber novas props `headerText`, `footerText`, `contactPage`
- Passar ao `FlipbookPage` via `FlipbookPageData`

**`EbookEditor.tsx`**:
- Adicionar secção nas ferramentas laterais para editar header/footer text e dados da página de contactos
- Guardar no ebook via `updateEbook`

**`PublicEbookPage.tsx`**:
- Carregar e passar os novos campos ao `FlipbookReader`

### 4. Página final de contactos e slogan

**`FlipbookPage.tsx`** — novo tipo de página `"contact"`:
- Layout gráfico com gradiente escuro (semelhante à capa)
- Logo (se fornecido)
- Slogan em destaque (font grande, itálico)
- Dados de contacto: email, telefone, website
- Links de redes sociais com ícones
- Ornamento decorativo de encerramento

**`FlipbookReader.tsx`** — no `buildPages`, adicionar a página de contactos como última página se `contactPage` tiver dados.

### Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| Migração SQL | 3 novas colunas: `header_text`, `footer_text`, `contact_page` |
| `FlipbookReader.tsx` | Novas props, passar header/footer, página de contactos no fim, ajustar split para imagens |
| `FlipbookPage.tsx` | Novo tipo `contact`, props de header/footer customizáveis |
| `EbookEditor.tsx` | UI para editar header, footer e dados de contacto |
| `PublicEbookPage.tsx` | Carregar e passar novos campos |

