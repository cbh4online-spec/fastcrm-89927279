

# Melhorias à Página de Produto — Padrão Amazon/Vinted

## Diagnóstico

Analisando os screenshots e o código atual, identifico os seguintes problemas:

### Descrição
1. **Texto em bloco monolítico** — a descrição comercial é renderizada como `whitespace-pre-wrap` num único `<p>`, sem qualquer estruturação (headings, listas, parágrafos separados)
2. **Sem "Read more / Ler mais"** — textos longos ocupam espaço excessivo sem colapsar, ao contrário da Amazon que mostra ~3-4 linhas e expande
3. **Sem bullet points de destaque** — a Amazon usa "About this item" com 5-7 pontos-chave antes da descrição completa; aqui os `benefits` existem mas não são suficientemente destacados
4. **HTML não formatado** — descrições importadas de fornecedores podem ter emojis e texto corrido sem parágrafos

### Especificações
1. **Chave "specs" aparece como linha raw** — no screenshot vê-se `specs: MarcaAkuvoxModeloE18C...` como texto colado sem parsing, o que indica que o campo `specs` no JSON de specifications contém um bloco de texto não estruturado
2. **Chaves não humanizadas** — "wdr", "nightVision", "compression" aparecem sem tradução (a Amazon mostra labels legíveis como "Visão Noturna", "Compressão de Vídeo")
3. **Campo "peso" sem valor** — aparece vazio no screenshot
4. **Grid de cards 3D-lite para specs técnicas** — bom visualmente mas ineficiente para scanning rápido de muitas specs; Amazon usa tabela simples (chave/valor) que é mais eficiente para 10+ specs

### Estrutura geral
5. **Falta secção "Destaques do Produto"** — Amazon/Vinted colocam os pontos-chave logo após o título
6. **Descrição e especificações lado a lado** — confuso quando a descrição é longa; deviam estar empilhados com tabs ou accordion

---

## Plano de Implementação

### 1. Criar componente `StoreProductDescription.tsx`
- Renderizar a descrição com parsing inteligente: detectar parágrafos (split por `\n\n` ou `.`+maiúscula), converter listas implícitas em `<ul>/<li>`
- Implementar "Ler mais / Ler menos" — colapsar após ~200 caracteres com gradiente de fade
- Sanitizar HTML com DOMPurify (já existe no projeto)
- Estilo: tipografia `prose` com espaçamento adequado

### 2. Criar componente `StoreProductHighlights.tsx`
- Secção "Sobre este produto" (estilo Amazon) posicionada logo após o preço/título na ZONE 2
- Extrair automaticamente os primeiros 5 benefícios + specs mais relevantes (marca, proteção, conectividade)
- Ícones contextuais + texto curto por highlight
- Se o produto não tiver `benefits`, gerar highlights a partir do `short_description` e specs principais

### 3. Refatorar secção de Especificações
- **Filtrar a chave `specs`** — detectar se o valor é um bloco de texto longo (>100 chars) e excluí-lo da tabela de specs (ou fazer parse se tiver padrão "Chave:Valor")
- **Humanizar labels** — criar mapa de tradução PT para chaves comuns (wdr→"WDR (Wide Dynamic Range)", nightVision→"Visão Noturna", lens→"Lente", etc.)
- **Filtrar specs vazias** — não mostrar linhas sem valor (ex: "peso" vazio)
- **Layout dual**: manter cards para ≤6 specs; mudar para tabela listrada (zebra stripes) estilo Amazon para >6 specs, agrupando por categoria quando possível
- **Expandir/colapsar** — mostrar 8 specs por defeito, "Ver todas as especificações" para expandir

### 4. Reorganizar layout da secção de detalhes (linhas 725-780)
- Substituir grid lado-a-lado por layout vertical empilhado:
  1. **Destaques do Produto** (highlights)
  2. **Descrição** (com ler mais/menos)
  3. **Especificações** (tabela humanizada)
- Adicionar âncoras/tabs para navegação rápida entre secções (scroll-to)

### 5. Criar mapa de tradução `specLabels.ts`
- Ficheiro utilitário com ~40 traduções de chaves técnicas comuns para português
- Função `humanizeSpecKey(key)` que retorna o label traduzido ou o key capitalizado como fallback

---

## Ficheiros a criar/editar

| Ficheiro | Ação |
|---|---|
| `src/components/store/StoreProductDescription.tsx` | Criar — descrição formatada com "Ler mais" |
| `src/components/store/StoreProductHighlights.tsx` | Criar — secção "Sobre este produto" |
| `src/utils/specLabels.ts` | Criar — mapa de tradução de specs |
| `src/pages/store/StoreProductPage.tsx` | Editar — integrar novos componentes, refatorar layout |

## Critérios de Aceitação
- Descrições longas colapsam com "Ler mais" (max ~200 chars visíveis)
- Specs com valor vazio não aparecem
- Chave `specs` com texto corrido é filtrada ou parseada
- Labels de specs humanizados em português
- Secção "Sobre este produto" visível com 3-5 pontos-chave
- Layout responsivo mobile mantido
- Sem regressões nos restantes componentes da página

