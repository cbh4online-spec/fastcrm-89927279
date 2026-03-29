

# Proteção de Documento no eBook Reader

## Ferramentas de Proteção Disponíveis (browser-side)

Num leitor web, a proteção é sempre "best-effort" — não é possível impedir a 100% um utilizador determinado, mas pode-se dificultar significativamente a cópia casual. Eis as camadas aplicáveis:

| Camada | Técnica | Eficácia |
|---|---|---|
| **Anti-selecção de texto** | CSS `user-select: none` no conteúdo das páginas | Alta para cópia casual |
| **Anti-clique-direito** | `onContextMenu` preventDefault no container do flipbook | Média — impede "Guardar imagem como" |
| **Anti-arrastar** | `onDragStart` preventDefault em imagens e texto | Alta para drag-and-drop |
| **Anti-print-screen** | CSS `@media print { display: none }` + listener de `keydown` para PrintScreen (limitado) | Baixa-Média |
| **Anti-impressão** | Remover/esconder botão de impressão na página pública; `@media print` esconde conteúdo | Média |
| **Marca d'água visual** | Overlay semi-transparente com nome do workspace/utilizador sobre cada página | Alta — desincentiva partilha |
| **Anti-DevTools** | Desabilitar atalhos comuns (F12, Ctrl+Shift+I) — puramente dissuasivo | Baixa |

## Proposta de Implementação

### 1. CSS de Proteção (`FlipbookReader.tsx`)
- Aplicar `user-select: none`, `-webkit-user-drag: none` e `pointer-events` controlado no container das páginas
- `onContextMenu={e => e.preventDefault()}` no wrapper do flipbook
- `onDragStart={e => e.preventDefault()}` em imagens

### 2. Marca d'Água Dinâmica (`FlipbookWatermark.tsx`)
- Novo componente overlay com texto diagonal semi-transparente (nome do workspace ou "Documento Protegido")
- Posicionado via `position: absolute` sobre cada página com `pointer-events: none`
- Configurável: o autor pode activar/desactivar e definir o texto na edição do eBook

### 3. Proteção de Impressão
- Na página pública: remover o botão de impressão e adicionar `@media print` que esconde todo o conteúdo do flipbook
- Na página do editor: manter impressão funcional (é o dono)

### 4. Configuração por eBook
- Novo campo `protection_enabled` (boolean, default true) na tabela `ebooks`
- Toggle no editor para o autor activar/desactivar proteções
- Quando activo, aplica todas as camadas na página pública

## Ficheiros a Alterar

| Ficheiro | Acção |
|---|---|
| Migração SQL | Adicionar `protection_enabled boolean default true` à tabela `ebooks` |
| `src/components/ebooks/FlipbookWatermark.tsx` | Novo — overlay de marca d'água |
| `src/components/ebooks/FlipbookReader.tsx` | Aplicar CSS anti-cópia + integrar watermark + condicionar impressão |
| `src/pages/PublicEbookPage.tsx` | Passar flag de proteção ao reader |
| `src/components/ebooks/EbookEditor.tsx` | Toggle de protecção no painel de settings |

## Critérios de Aceitação

- Texto não seleccionável na página pública quando proteção activa
- Clique-direito bloqueado no flipbook público
- Marca d'água visível mas não obstrutiva sobre cada página
- `Ctrl+P` / `@media print` não revela conteúdo na página pública
- Editor mantém todas as funcionalidades (impressão, selecção) independentemente da flag
- Toggle funcional no editor para activar/desactivar proteção
- Mobile: proteção funciona em touch (long-press não abre menu de cópia)

