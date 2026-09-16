# Loja pública a usar o conteúdo do AI Commerce

## Diagnóstico

O conteúdo estruturado do AI Commerce (descrição longa, público-alvo, problema resolvido, casos de uso, funcionalidades, benefícios, FAQ, palavras-chave, tipo Schema.org, canonical, SEO) já está gravado por produto, mas hoje só é usado em três sítios: a API pública `commerce-api`, os feeds e o painel interno. A loja pública ignora-o e mostra apenas os campos antigos do produto (`short_description`, `commercial_description`, `benefits`, especificações).

Resultado prático: produtos com conteúdo bem preenchido no AI Commerce continuam a aparecer "pobres" na loja, e a página não publica FAQ nem dados estruturados coerentes.

Verificações feitas: a leitura pública do conteúdo AI Commerce já é permitida sem sessão, e a página de produto já tem um componente de SEO com dados estruturados onde encaixar a FAQ.

## Decisões de produto/UX

- O conteúdo próprio do produto continua a mandar. O AI Commerce **preenche lacunas**, nunca substitui texto já escrito à mão.
- Ordem usada em cada campo:
  - Descrição longa: descrição comercial existente → descrição longa AI Commerce.
  - Resumo curto: `short_description` → resumo AI Commerce.
  - Benefícios/destaques: benefícios do produto → funcionalidades-chave do AI Commerce.
  - Novas secções: "Para quem é" (público-alvo, problema resolvido, casos de uso) e "Perguntas frequentes" (FAQ), só quando existir conteúdo.
- Nada é inventado: se um campo estiver vazio, a secção simplesmente não aparece.
- Só é usado conteúdo de produtos com AI Commerce ativo e publicados na loja.
- Preço, stock, avaliações e prazos continuam a vir dos dados reais da loja — o AI Commerce não influencia valores.

## Estrutura técnica

1. **Novo hook** `src/hooks/useStoreProductAICommerce.ts`
   - Lê `product_ai_commerce` por `product_id` (leitura anónima já permitida), devolve conteúdo normalizado e `null` quando desativado.
   - FAQ validada e limitada (perguntas/respostas com texto, máximo razoável de entradas) antes de renderizar.

2. **Nova camada de resolução de conteúdo** `src/lib/store/productContent.ts`
   - Função pura que recebe produto + conteúdo AI Commerce e devolve o conteúdo final da página segundo a ordem acima. Testável isoladamente.

3. **Página de produto** `src/pages/store/StoreProductPage.tsx`
   - Passa o conteúdo resolvido a `StoreProductHighlights` e `StoreProductDescription`.
   - Acrescenta duas secções novas: "Para quem é" e "Perguntas frequentes" (acordeão), posicionadas depois das especificações e antes da faixa de confiança.

4. **SEO e dados estruturados** `src/components/store/storefront/ProductSeoHead.tsx`
   - Título/descrição meta passam a usar os campos SEO do AI Commerce quando existirem.
   - Tipo Schema.org do produto respeita o definido no AI Commerce (`Product`, `SoftwareApplication`, `Service`, `Course`).
   - Adiciona bloco `FAQPage` quando houver FAQ válida.
   - Canonical usa o definido no AI Commerce apenas se apontar para a própria loja; caso contrário mantém o atual (evita canonical errado a apontar para fora).

5. **Cartões de listagem** (`StoreProductCard`, linha de lista)
   - Sem alteração visual nesta fase; o resumo AI Commerce entra apenas na página de produto para não alterar o layout do catálogo.

6. **Segurança**
   - Existe uma regra de leitura pública demasiado aberta sobre o conteúdo AI Commerce (permite ler conteúdo de produtos não publicados). Vai ser substituída pela regra correta, que exige produto publicado na loja. Migração aditiva, sem perda de dados.

7. **Testes e validação**
   - Testes da camada de resolução de conteúdo (prioridades, campos vazios, FAQ inválida).
   - Verificação de tipos, testes e build.
   - Validação no navegador num produto Ajax com conteúdo AI Commerce preenchido: secções visíveis, FAQ presente, dados estruturados válidos.

## Ordem de implementação

1. Migração da regra de leitura pública.
2. Hook + camada de resolução de conteúdo + testes.
3. Página de produto (secções novas e conteúdo resolvido).
4. SEO/dados estruturados.
5. Verificação de tipos, testes, build e validação no navegador.

## Critérios de aceitação

- Produto com AI Commerce preenchido mostra descrição longa, destaques, "Para quem é" e FAQ na loja pública.
- Produto sem AI Commerce mantém exatamente o aspeto atual.
- Conteúdo de outro espaço de trabalho ou de produto não publicado nunca aparece.
- Dados estruturados do produto e da FAQ validam sem campos inventados.
- Verificação de tipos, testes e build verdes.

## Riscos e pontos por validar

- Alguns produtos podem ter descrições AI Commerce longas; é aplicada a mesma leitura "ver mais" já existente.
- Publicação para o domínio público continua bloqueada por 2 alertas críticos de segurança pendentes que precisam de revisão.
