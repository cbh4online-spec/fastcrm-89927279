
# Produtos Relacionados, Compativeis e Consultor IA na Loja

Atualmente, a loja ja tem "Frequentemente comprados juntos" e "Clientes tambem viram", mas ambos usam logica simples baseada na mesma categoria. Este plano adiciona **relacoes inteligentes entre produtos** e um **consultor IA** para ajudar o cliente a escolher.

---

## 1. Tabela de Relacoes entre Produtos

Criar uma nova tabela `product_relations` que suporta 3 tipos de relacao:

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| `related` | Produtos semelhantes/alternativos | Camera A vs Camera B |
| `compatible` | Produtos compativeis/acessorios | Camera + Suporte + Cartao SD |
| `bundle` | Sugeridos para compra conjunta | Kit completo de videovigilancia |

**Campos:** source_product_id, target_product_id, relation_type, reason (texto explicativo), sort_order, is_active, workspace_id

---

## 2. Gestao de Relacoes no Backoffice

Adicionar um separador "Relacoes" na edicao de produto (dashboard) onde o gestor pode:
- Pesquisar e adicionar produtos relacionados, compativeis ou de bundle
- Definir a razao/motivo da relacao (ex: "Acessorio recomendado")
- Reordenar e ativar/desativar relacoes
- Botao "Sugerir com IA" que analisa o produto e sugere relacoes automaticamente

**Ficheiros:**
- Criar `src/components/products/ProductRelationsTab.tsx` - UI de gestao das relacoes

---

## 3. Seccoes na Pagina de Produto da Loja

Substituir/complementar as seccoes atuais com dados reais da tabela `product_relations`:

### "Produtos Compativeis" (novo)
- Mostra produtos com relacao `compatible`
- Icone de puzzle/link para transmitir compatibilidade
- Permite adicionar diretamente ao carrinho

### "Produtos Relacionados" (melhorado)
- Usa relacoes `related` da tabela em vez de apenas mesma categoria
- Fallback para logica atual (mesma categoria) se nao houver relacoes definidas

### "Compre Junto" (melhorado)
- Usa relacoes `bundle` da tabela em vez de produtos aleatorios da mesma categoria
- Fallback para logica atual se nao houver bundles definidos

**Ficheiros:**
- Criar `src/components/store/sections/StoreCompatibleProducts.tsx`
- Modificar `StoreRelatedProducts.tsx` - usar relacoes da BD com fallback
- Modificar `StoreBoughtTogether.tsx` - usar relacoes da BD com fallback
- Modificar `StoreProductPage.tsx` - adicionar seccao de compativeis

---

## 4. Consultor IA na Loja (Chat de Aconselhamento)

Widget flutuante na loja que permite ao visitante pedir ajuda para escolher produtos. Usa IA (Gemini) para analisar o catalogo e recomendar.

### Comportamento
- Botao flutuante "Precisa de ajuda?" no canto inferior direito da loja
- Abre um painel de chat onde o visitante descreve o que precisa
- A IA analisa o catalogo do workspace e recomenda produtos com links diretos
- Suporta perguntas como "Qual a melhor camera para exterior?" ou "O que preciso para montar um sistema completo?"

### Backend
- Nova edge function `store-ai-advisor` que:
  1. Recebe a pergunta do visitante e o workspaceId
  2. Busca produtos relevantes do catalogo (usando pesquisa por texto)
  3. Usa Gemini para gerar recomendacao personalizada com links
  4. Retorna resposta formatada com produtos sugeridos

### Frontend
- Criar `src/components/store/StoreAIAdvisor.tsx` - widget de chat flutuante
- Integrar na `StoreProductPage.tsx` e `StorePage.tsx`

---

## 5. Sugestao Automatica de Relacoes por IA

Novo modo no `ai-product-assistant` que analisa um produto e sugere relacoes:
- Analisa nome, categoria, especificacoes e descricao do produto
- Compara com todos os outros produtos do workspace
- Sugere compativeis (acessorios), relacionados (alternativas) e bundles
- O gestor revisa e confirma as sugestoes

**Ficheiro:** Adicionar modo `suggest-relations` ao `ai-product-assistant/index.ts`

---

## Detalhe Tecnico

### Tabela product_relations (SQL)
```text
- id (uuid, PK)
- workspace_id (uuid, FK workspaces)
- source_product_id (uuid, FK products)
- target_product_id (uuid, FK products)
- relation_type (text: 'related' | 'compatible' | 'bundle')
- reason (text, nullable - ex: "Acessorio recomendado")
- sort_order (integer, default 0)
- is_active (boolean, default true)
- created_at (timestamptz)
- UNIQUE(source_product_id, target_product_id, relation_type)
- RLS: workspace members podem gerir; leitura publica para store_published
```

### Edge Function store-ai-advisor
- Endpoint POST com body: { question, workspaceId, productContext? }
- Busca ate 20 produtos publicados do workspace
- Constroi prompt com catalogo e pergunta do visitante
- Responde em PT-PT com recomendacoes e IDs de produtos
- Rate limit: maximo 10 perguntas por sessao

### Ordem de implementacao
1. Criar tabela `product_relations` (migracao)
2. Gestao de relacoes no backoffice (ProductRelationsTab)
3. Seccoes na loja (Compativeis + melhorar Relacionados/Bundles)
4. Edge function `store-ai-advisor`
5. Widget de consultor IA na loja
6. Modo `suggest-relations` na edge function existente
