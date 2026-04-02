

# Editar Valores em Propostas — Criação e Detalhe

## Diagnóstico

A funcionalidade de edição de preço, quantidade e desconto **já existe** em ambos os contextos, mas com lacunas:

| Campo | Criação (ProposalCart) | Detalhe (POSProposalItemsEditor) | Detalhe (ProposalInternalView) |
|---|---|---|---|
| Preço | ✅ (escondido no collapsible) | ✅ inline | ✅ inline |
| Quantidade | ✅ | ✅ | ✅ |
| Desconto | ✅ (escondido) | ✅ (escondido) | ❌ |
| Nome | ❌ | ❌ | ❌ |
| Descrição | ❌ | ❌ | ❌ |

**Problemas identificados:**
1. **Nome e descrição não são editáveis** em nenhum dos contextos — apenas texto estático
2. **Desconto não disponível** na vista `ProposalInternalView`
3. **UX de edição pouco visível** — preço/desconto escondidos atrás de ícone de lápis pequeno

## Plano

### 1. Tornar nome e descrição editáveis

**POSProposalItemsEditor** (edição após criação):
- Converter o `<h4>` estático do nome (linha 407-409) para `<Input>` editável
- Adicionar campo de descrição editável no painel expandido (collapsible)
- Adicionar handler `handleUpdateName` e `handleUpdateDescription`

**ProposalInternalView** (vista de detalhe):
- Converter nome estático para `<Input>` inline editável
- Adicionar campo de descrição editável abaixo do nome
- Ligar aos callbacks `onNameChange` e `onDescriptionChange` (novos props)

**ProposalCart** (criação):
- Adicionar campo de nome editável no painel expandido (collapsible)

### 2. Adicionar desconto na ProposalInternalView

- Adicionar coluna "Desc." na tabela de itens
- Input numérico com percentagem, que atualiza o preço unitário
- Novo callback `onDiscountChange`

### 3. Melhorar descobribilidade da edição

- No `ProposalCart`, mostrar o preço como `<Input>` inline visível (sem necessidade de expandir)
- Manter o collapsible para desconto e opções avançadas

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/components/proposals/POSProposalItemsEditor.tsx` | Nome e descrição editáveis; nome como Input inline |
| `src/components/proposals/ProposalInternalView.tsx` | Nome editável; coluna desconto; novos props |
| `src/components/proposals/ProposalDetailContent.tsx` | Handlers para `onNameChange`, `onDescriptionChange`, `onDiscountChange` |
| `src/components/proposals/ProposalCart.tsx` | Nome editável no collapsible; preço visível como Input inline |

## Critérios de aceitação

- Nome e descrição editáveis em ambos os contextos (criação e detalhe)
- Desconto editável na vista de detalhe (ProposalInternalView)
- Preço visível e editável sem necessidade de expandir no carrinho
- Alterações persistem na BD ao guardar
- Funciona em mobile (viewport 393px)

