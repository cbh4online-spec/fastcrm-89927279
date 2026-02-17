
# Adicionar link copiavel para a Bio do Instagram

## Problema
Nao existe um botao para copiar o link publico completo da pagina Bio. O utilizador precisa de um URL completo (ex: `https://fastcrm.metodopare.ai/b/{workspace_id}/{slug}`) para colar na bio do Instagram.

## Solucao
Adicionar um botao "Copiar Link" nos dois locais onde se acede a paginas Bio:

### 1. `src/components/bio/BioPageBuilder.tsx`
- Importar `getPublicBaseUrl` de `@/utils/getPublicDomain`
- Importar icone `Copy` e `Check` de lucide-react
- Ao lado do botao "Ver Pagina", adicionar botao "Copiar Link" que:
  - Constroi o URL completo: `${getPublicBaseUrl()}/b/${page.workspace_id}/${page.slug}`
  - Copia para o clipboard com `navigator.clipboard.writeText()`
  - Mostra toast de confirmacao
  - Icone muda para Check durante 2 segundos como feedback visual

### 2. `src/pages/BioOS.tsx`
- Na lista de paginas (card de cada pagina), adicionar um botao com icone `Copy` ao lado do botao ExternalLink
- Mesma logica: copiar URL completo para clipboard
- So aparece quando `page.status === "live"`

### Detalhes tecnicos
- Usar `getPublicBaseUrl()` para garantir que o URL e o do dominio publico (nao o de preview do Lovable)
- Usar `navigator.clipboard.writeText()` + toast da sonner
- 2 ficheiros alterados, sem dependencias novas
