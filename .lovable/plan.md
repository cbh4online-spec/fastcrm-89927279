

# Adicionar Botão de Partilha na Página Pública do Marketplace C2C

## Contexto
Quando alguém copia o URL diretamente do browser (`https://fastcrm.metodopare.ai/c2c/metodopare`) e cola no WhatsApp/Facebook, os crawlers recebem o `index.html` genérico porque é uma SPA — os crawlers não executam JavaScript. **Isto é uma limitação fundamental de SPAs** e não pode ser resolvido sem controlo do servidor/CDN.

O `og-proxy` já resolve isto, mas só funciona quando o URL partilhado é o do proxy. A variável `shareUrl` já existe na página mas **não é usada em lado nenhum** — não há `ShareButtons` na página pública.

## Solução
Adicionar um botão de partilha visível e proeminente no header/hero da página pública do marketplace, usando o `shareUrl` (og-proxy). Assim, quando o utilizador quer partilhar:
- Clica no botão de partilha → copia o URL do og-proxy → crawlers recebem OG tags corretos
- Em vez de copiar manualmente o URL do browser

## Alterações

### 1. `src/pages/c2c/C2CPublicMarketplace.tsx`
- Importar `ShareButtons` de `@/components/c2c/ShareButtons`
- Adicionar `ShareButtons` no header (ao lado dos botões "Entrar" e "Vender"), passando `url={shareUrl}` e `title={ogTitle}`

### 2. `src/pages/c2c/C2CPublicSellerProfile.tsx`
- Verificar se já tem `ShareButtons` — se não, adicionar igualmente com `getShareUrl("c2c-seller", ...)`

Resultado: o utilizador terá sempre um botão de partilha visível que gera o link correto com preview rico.

