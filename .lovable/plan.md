

## Problema

A partilha no Marketplace C2C usa o componente `ShareButtons` — uma linha simples com ícones (WhatsApp, Facebook, Copiar). A loja online tem o `StoreShareCard`, muito mais completo: QR Code, URL copiável visível, botões de WhatsApp, Email e Abrir Loja.

## Plano

### 1. Criar `MarketplaceShareCard` baseado no `StoreShareCard`

Novo ficheiro `src/components/c2c/MarketplaceShareCard.tsx` — um Card com:
- QR Code do marketplace com botão de download
- URL visível com botão de copiar
- Botões de partilha rápida: WhatsApp, Email, Facebook, Abrir Marketplace
- Props: `marketplaceUrl`, `marketplaceName`

Reutiliza o mesmo padrão visual do `StoreShareCard` (layout flex com QR à esquerda e ações à direita).

### 2. Atualizar `ShareButtons` para incluir Email

Adicionar botão de Email ao `ShareButtons` inline (usado nas páginas públicas e detalhe de anúncio), mantendo-o compacto.

### 3. Integrar `MarketplaceShareCard` nas configurações/gestão do C2C

Usar o `MarketplaceShareCard` nas páginas de gestão do marketplace (ex: `C2CMyListings` ou painel de configuração do workspace), onde faz sentido ter a versão completa com QR — semelhante a como o `StoreShareCard` aparece nas definições da loja.

### Ficheiros a criar/alterar
- **Criar** `src/components/c2c/MarketplaceShareCard.tsx` — card completo com QR + partilha
- **Alterar** `src/components/c2c/ShareButtons.tsx` — adicionar botão de Email
- **Alterar** `src/pages/c2c/C2CMyListings.tsx` — incluir `MarketplaceShareCard` no topo da página de gestão

