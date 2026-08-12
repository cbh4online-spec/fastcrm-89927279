# MVP HTML Builder — editor visual funcional

## Diagnóstico

O módulo já tem base sólida: assets, blocos, versões, publicação, analytics, variantes A/B, IA, export ZIP e um modo visual inicial. O que falha é a **experiência de edição**:

- O ecrã abre em modo Código (3 colunas: código + preview + painel), o que é intimidante para quem só quer montar uma página.
- Os blocos só se inserem no cursor do editor de código — não há inserção no ponto certo da página nem reordenação.
- Não existe desfazer/refazer, nem duplicar/eliminar/mover secções.
- Sem pré-visualização por dispositivo (desktop/tablet/telemóvel) no canvas.
- Sem painel de SEO/metadados (título, descrição, favicon, OG) apesar de ser uma página pública.
- Estado de gravação pouco visível e sem atalhos de teclado.

## Objetivo do MVP

Editor **visual-first**: abrir no canvas, arrastar blocos, editar no sítio, desfazer, ver em mobile, definir SEO e publicar — mantendo o modo Código e **todas** as funcionalidades atuais acessíveis.

## O que vai ser construído

1. **Canvas como modo por defeito**
   - Layout de 2 colunas: canvas central grande + painel lateral direito; painel esquerdo de blocos abre por botão.
   - Alternador Visual / Código mantém-se no cabeçalho; o Código passa a ecrã inteiro com preview lateral.

2. **Blocos com drop no sítio certo**
   - Arrastar um bloco da biblioteca para o canvas; indicador de linha mostra onde vai cair (antes/depois da secção sob o rato).
   - Clique simples continua a inserir no fim (fallback sem rato/arrasto).

3. **Manipulação de secções no canvas**
   - Barra flutuante na secção selecionada: mover para cima/baixo, duplicar, eliminar, guardar como bloco.
   - Contorno e etiqueta da secção ao passar o rato.

4. **Histórico desfazer/refazer**
   - Pilha de estados do HTML (limite ~50), com `Ctrl/⌘+Z` e `Ctrl/⌘+Shift+Z`, botões no cabeçalho.

5. **Pré-visualização responsiva**
   - Botões Desktop / Tablet / Telemóvel que ajustam a largura do canvas; abrir num separador novo.

6. **Painel SEO & Metadados**
   - Título, descrição, imagem OG, idioma e favicon, escritos/lidos no `<head>` do HTML e sincronizados com o `metadata` do asset.
   - Contadores de caracteres com limites recomendados (título <60, descrição <160).

7. **Polimento de UX**
   - Indicador de gravação claro (Guardado / A guardar / Erro com repetir) e `⌘+S` para forçar.
   - Atalhos: `⌘K` procura de blocos, `Del` elimina secção, `⌘D` duplica.
   - Estados vazios, loading e erro tratados; ações só-ícone com `aria-label`; navegação por teclado no canvas.

## Estrutura técnica

- `src/modules/builder/hooks/useBuilderHistory.ts` — pilha undo/redo sobre o HTML.
- `src/modules/builder/lib/builderHtmlPatch.ts` — juntar operações de secção: `moveSection`, `duplicateSection`, `removeSection`, `insertHtmlAt(bid, position)`.
- `src/modules/builder/lib/builderSeo.ts` — ler/escrever tags do `<head>` (title, description, og:*, lang, favicon) via DOMParser, com sanitização pelo `sanitizeBuilderHtml` existente.
- `src/modules/builder/lib/visualBridgeScript.ts` — estender a ponte iframe com eventos de hover, drag-over e drop, devolvendo `bid` alvo e posição.
- `src/modules/builder/components/BuilderCanvas.tsx` — canvas com larguras por dispositivo e zona de drop.
- `src/modules/builder/components/BuilderSectionToolbar.tsx` — ações flutuantes da secção.
- `src/modules/builder/components/BuilderSeoPanel.tsx` — novo separador no painel lateral.
- `BuilderBlocksPanel.tsx` — tornar itens arrastáveis (HTML5 drag) e adicionar pesquisa.
- `BuilderAssetEditorPage.tsx` — reorganizar layout, ligar histórico, atalhos e modo por defeito.

Sem alterações de base de dados: tudo assenta nas tabelas e hooks existentes. Sem alterações a RLS, publicação, analytics ou variantes.

## Critérios de aceitação

- Ao abrir um asset, vê-se o canvas visual com a página renderizada, sem código.
- Arrastar um bloco insere-o exatamente onde o indicador mostra; o HTML guarda automaticamente.
- Mover, duplicar e eliminar secções funciona e é reversível com desfazer.
- Alternar dispositivo muda a largura do canvas sem recarregar o conteúdo.
- SEO editado no painel aparece no HTML publicado.
- Modo Código continua disponível e sincronizado; blocos, versões, IA, A/B, analytics, export e publicação continuam funcionais.
- Consola sem erros; funciona em ecrãs a partir de ~1024px, com aviso em ecrãs muito pequenos.

## Riscos por validar

- Drag & drop dentro de iframe exige ponte de eventos — se algum browser falhar, o fallback é inserir no fim e mover com a barra da secção.
- HTML clonado de sites externos pode não ter estrutura de secções clara; nesse caso o fluxo do `BuilderClonedSiteWorkspace` mantém-se inalterado.
