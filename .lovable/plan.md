

## Diagnóstico

Analisando o screenshot (IMG_0414.png) no viewport ~393px:

1. **Texto de categoria continua a transbordar** — "ACESSÓRIOS DE SEGURANÇA / PEÇAS DE REPOSIÇÃO" ocupa 5-6 linhas no card, mesmo com `line-clamp-1` aplicado. O problema é que o `line-clamp-1` está aplicado mas o `uppercase tracking-widest` expande muito o texto horizontalmente, forçando quebras.

2. **"SD" visível ao lado do logo** — O `storeName` mostra "SD" (initials) porque `hidden sm:inline` esconde apenas o nome completo, mas o storeName recebido pode ser curto. Na verdade, o logo existe e o "SD" é provavelmente o texto que deveria estar completamente escondido em mobile quando há logo.

3. **Cards demasiado altos** — A combinação de imagem + categoria multilinha + nome + short_description (mesmo hidden) + preço cria cards muito altos para mobile.

4. **Quick actions sempre visíveis empilham 5+ botões** — Em mobile, os quick actions (Compare, Quick View, Wishlist, Quick Buy, Cart) estão agora todos visíveis, criando uma coluna de 5 botões sobre a imagem que é intrusiva.

5. **Build error** — O log de build foi truncado. Preciso verificar se há um erro real de compilação ou apenas warnings de tamanho de bundle.

## Plano de Implementação

### 1. Corrigir truncagem de categoria nos cards
**Ficheiro:** `src/components/store/StoreProductCard.tsx`
- Adicionar `overflow-hidden text-ellipsis` à categoria além de `line-clamp-1`
- Reduzir `tracking-widest` para `tracking-wider` em mobile para evitar expansão horizontal
- Considerar esconder a categoria completamente em `< 375px` se continuar a transbordar

### 2. Esconder completamente storeName quando há logo em mobile
**Ficheiro:** `src/components/store/StoreHeader.tsx`
- Quando `logoUrl` existe, o `storeName` deve ser `hidden sm:inline` sem exceção
- Verificar se o "SD" que aparece é o storeName ou outro elemento

### 3. Reduzir quick actions em mobile
**Ficheiro:** `src/components/store/StoreProductCard.tsx`
- Em mobile, mostrar apenas 2 botões essenciais: Wishlist + Carrinho
- Esconder Compare, Quick View e Quick Buy em mobile (`hidden sm:flex`)
- Isto reduz a intrusão visual sobre a imagem do produto

### 4. Verificar e corrigir erro de build
- Investigar se o build realmente falhou ou se o log foi apenas truncado
- Se houver erro TypeScript, corrigir a causa raiz

## Critérios de Aceitação
- Categoria limitada a 1 linha sem overflow em 375-414px
- Nenhum texto extra ao lado do logo em mobile
- Máximo 2-3 quick actions visíveis em mobile
- Build passa sem erros
- Cards compactos e legíveis em mobile

