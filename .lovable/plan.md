

# Adicionar Templates de Pedido de Documentação Blecksen + Importação Fácil

## Resumo

O documento contém **5 templates de email** para pedido de documentação financeira a diferentes tipos de cliente. Vamos adicioná-los à biblioteca existente e criar uma forma fácil de importar novos templates no futuro.

## Templates identificados no documento

1. **Empresas** — Documentos para financiamento de empresas (Certidão Permanente, Balancete, IES, etc.)
2. **Empresários em Nome Individual (ENI)** — Recibos verdes, CC, extratos bancários
3. **Nacionais/Residentes - Conta de Outrem** — Recibos de vencimento, IRS, extratos, vínculo laboral
4. **Nacionais/Residentes - Conta Própria / Sócios Gerentes** — 6 recibos, IES empresa, certidão comercial
5. **Garantia Jovem** — Documentação para proponentes particulares jovens

## Plano de implementação

### 1. Nova categoria "Financiamento"

Adicionar `financiamento` ao tipo `LibraryCategory` e aos mapas `LIBRARY_CATEGORIES`, `CATEGORY_LABELS`, e `CATEGORY_COLORS` nos ficheiros relevantes.

### 2. Adicionar os 5 templates ao `templateLibraryData.ts`

Cada template terá:
- **channel**: `email`
- **tone**: `formal`
- **structureType**: `custom`
- **fields**: Secções do documento (Saudação, Documentos Empresa, Documentos Pessoais, etc.)
- **body**: Conteúdo completo com check-list e links para portais (eportugal, portaldasfinanças, bportugal, etc.)
- **subject**: Ex: "Documentação necessária para Financiamento — Empresas"

### 3. Funcionalidade de importação via upload (facilitador)

Adicionar um botão **"Importar Template"** na `TemplatesListPage` que permite:
- Upload de ficheiro `.docx` ou `.txt`
- Parse do conteúdo no browser (usando a lib existente ou texto simples)
- Pré-preenchimento do formulário de criação de template com o conteúdo extraído
- O utilizador revê e confirma antes de guardar

Isto será um botão ao lado do "Novo Template" que abre o `TemplateFormDialog` já pré-preenchido com o conteúdo do ficheiro.

### Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/communication/templateLibraryData.ts` | Nova categoria + 5 templates |
| `src/components/communication/TemplateLibraryCard.tsx` | Cor para nova categoria |
| `src/components/communication/TemplatePreviewPanel.tsx` | Cor para nova categoria |
| `src/components/communication/TemplatesListPage.tsx` | Botão "Importar" com upload de ficheiro |
| `src/components/communication/ImportTemplateDialog.tsx` | Novo componente — dialog de importação com drag-and-drop e preview |

