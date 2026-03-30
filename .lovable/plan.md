

# Verificação e Correcção do Glossário

## Diagnóstico

A página `/glossary` está funcional — lista termos agrupados por letra, navegação alfabética, pesquisa e página de detalhe a funcionar. No entanto, existem problemas a corrigir:

### Problemas encontrados

1. **Canonical URL errado** — Linha 68 de `GlossaryListPage.tsx` aponta para `https://fastcrm.lovable.app/glossary` em vez de `https://fastcrm.metodopare.ai/glossary`
2. **Pesquisa limitada à página actual** — O filtro de pesquisa só filtra os 24 termos carregados na página corrente, não pesquisa todos os termos da base de dados
3. **Cards sem descrição** — Os cards de termos mostram apenas o título e seta, sem qualquer contexto (tldr/meta_description) que ajude o utilizador a decidir se quer clicar
4. **Falta estado loading nas páginas seguintes** — O skeleton só aparece quando `page === 1`, nas restantes páginas não há indicação de carregamento

## Plano de Implementação

### 1. Corrigir canonical URL
Actualizar para usar domínio correcto ou remover hardcode e usar `window.location.origin`.

### 2. Carregar todos os termos para pesquisa local
Quando existe `searchQuery`, buscar todos os termos (sem paginação) para que a pesquisa funcione sobre o glossário inteiro. Alternativa: aumentar o limit quando há pesquisa activa.

### 3. Adicionar tldr aos cards
Mostrar o `tldr` ou `meta_description` truncado por baixo do título em cada card para dar contexto ao utilizador.

### 4. Corrigir loading em todas as páginas
Remover a condição `page === 1` do skeleton ou adicionar um indicador de loading inline para páginas subsequentes.

## Ficheiro a alterar

| Ficheiro | Alteração |
|---|---|
| `src/modules/growth-seo/pages/GlossaryListPage.tsx` | Corrigir canonical, pesquisa, cards com descrição, loading |

## Critérios de Aceitação
- Canonical URL correcto
- Pesquisa funciona sobre todos os termos
- Cards mostram descrição curta
- Loading visível em todas as páginas

