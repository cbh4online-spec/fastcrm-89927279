

# Produtos — QR Code, Menu, Pagamentos e Ficha Rica

## 4 Problemas Identificados

### 1. QR Code — Verificar Funcionamento
O QR code usa `react-qr-code` e aponta para `/product/:slug` (ou `/product/:id` se não tiver slug). A rota pública `PublicProductSheet` existe em `VerticalOpsRoutes.tsx`. O problema potencial é que o `getPublicBaseUrl()` usa `window.location.origin` — que no backoffice aponta para o domínio do dashboard, não o domínio público publicado. Se a ficha não está publicada (`sheet_published = false`), o QR aponta para um ID interno que pode não ter página pública.

**Fix**: Validar que o QR usa o URL correto, e mostrar aviso visual quando a ficha não está publicada.

### 2. Sidebar — Linhas Sobrepostas
No `AdaptiveSidebar.tsx`, os links dentro de grupos colapsáveis usam `space-y-0.5` e alturas dinâmicas baseadas no perfil etário (`style.itemHeight`). Quando há muitos itens com ícones + texto, em certas combinações de tamanho o espaçamento é insuficiente.

**Fix**: Aumentar `space-y` para `space-y-1`, garantir `min-h` nos links e adicionar `py-1.5` padding vertical mínimo nos itens de menu.

### 3. Pagamentos — Módulo Incompleto
A página `Payments.tsx` existe mas é básica: 4 KPIs + tabela simples. Está **oculta no sidebar** (`visibleInSidebar: false`). Faltam:
- Visibilidade no menu
- Filtros por estado/data/valor
- Pesquisa por oportunidade/cliente
- Detalhe do pagamento
- Registo manual de pagamento
- Ações de reembolso
- Exportação

**Fix**:
- Tornar visível no sidebar (`visibleInSidebar: true`)
- Adicionar toolbar com filtros, pesquisa e exportação
- Adicionar dialog de registo manual de pagamento
- Adicionar ações por linha (ver detalhe, marcar como reembolsado)
- Expandir KPIs (adicionar falhados, reembolsos)

### 4. Ficha do Produto — Precisa de Mais Riqueza Visual
A ficha atual é funcional mas visualmente pobre no topo. Não mostra imagem principal, logo da empresa, nem galeria. O header é apenas texto + badges.

**Fix**: Redesenhar o topo da ficha do produto:
- **Hero section**: Imagem principal do produto (da galeria `product_images`) em destaque, com fallback para placeholder visual
- **Logo/marca**: Mostrar logo do workspace (já disponível via `storeSettings?.logo_url`)
- **Layout rico**: Imagem à esquerda, info à direita (nome, badges, preço, margem, SKU)
- **Mini-galeria**: Thumbnails das imagens abaixo da imagem principal
- **Gradiente/overlay**: Visual mais premium no header

## Ficheiros a Modificar

| Ficheiro | Mudança |
|---|---|
| `src/components/products/ProductBarcodeQRSection.tsx` | Validar URL do QR, aviso quando ficha não publicada |
| `src/components/layout/AdaptiveSidebar.tsx` | Fix spacing nos links de menu |
| `src/config/routeManifest.ts` | Tornar "Pagamentos" visível no sidebar |
| `src/pages/Payments.tsx` | Redesenho completo: filtros, pesquisa, registo manual, reembolso, exportação |
| `src/components/products/ProductDetailDialog.tsx` | Redesenhar header com hero image, logo, mini-galeria |

