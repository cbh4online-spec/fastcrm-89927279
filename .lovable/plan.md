

## Importar Ficheiro HTML no Editor de Email

### O que será feito
Adicionar um botão "Importar HTML" no header do Email Builder que permite ao utilizador carregar um ficheiro `.html` do computador. O conteúdo HTML será inserido como um bloco HTML personalizado no canvas.

### Alterações

#### `src/components/email-builder/EmailBuilder.tsx`
- Adicionar botão "Importar" no header (junto ao botão "HTML"), com ícone `Upload`
- Criar `<input type="file" accept=".html,.htm" />` hidden, triggered pelo botão
- No `onChange` do input:
  - Ler o ficheiro com `FileReader.readAsText()`
  - Chamar `addBlock('html')` para criar um bloco HTML
  - Imediatamente fazer `updateBlock(newBlockId, { content: { html: conteúdo } })` com o HTML importado
- Mostrar toast de sucesso/erro

### Ficheiros a alterar
- `src/components/email-builder/EmailBuilder.tsx`

