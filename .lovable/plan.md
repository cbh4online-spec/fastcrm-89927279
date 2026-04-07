

## Diagnóstico

A página de detalhe de produto (`StoreProductPage.tsx`) apresenta problemas visuais visíveis no screenshot:

1. **Card de partilha duplica conteúdo** — O componente `StoreShareButtons` inclui um "mini preview card" (linhas 105-113) que repete imagem + título + descrição do produto, criando redundância visual na Zona 2
2. **Espaçamento excessivo** — Grande espaço vazio entre a secção de partilha e "Sobre este produto", possivelmente causado pelo grid 3-colunas quando a galeria (Zona 1) não tem imagens visíveis
3. **Layout 3-colunas a colapsar** — Se não há imagens ou se a galeria colapsa, o grid `lg:grid-cols-[1fr_1fr_320px]` fica desequilibrado

## Plano de Implementação

### 1. Remover mini preview card do StoreShareButtons
**Ficheiro:** `src/components/store/StoreShareButtons.tsx`
- Remover o bloco de preview card (linhas 105-113) que duplica informação do produto
- Manter apenas a linha de ícones de partilha, tornando-a mais compacta

### 2. Proteger layout da galeria vazia
**Ficheiro:** `src/pages/store/StoreProductPage.tsx`
- Quando `images` está vazio e não há vídeo, a Zona 1 deve mostrar o placeholder com dimensões adequadas (já existe, mas verificar se o aspect-ratio está a funcionar)
- Garantir que o grid não colapsa visualmente em cenários sem imagens

### 3. Reduzir espaçamento entre Zona 2 e secção de detalhes
**Ficheiro:** `src/pages/store/StoreProductPage.tsx`
- Verificar que o `mt-12` no bloco de detalhes (linha 812) não cria gap excessivo
- Ajustar para `mt-8` se necessário

## Critérios de Aceitação
- Sem duplicação de informação do produto na área de partilha
- Layout equilibrado com e sem imagens de produto
- Espaçamento proporcional entre secções
- Responsividade mantida em mobile e desktop

