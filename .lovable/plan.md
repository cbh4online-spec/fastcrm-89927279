

# Plano: Barcode Scan Entry para FastCRM

## Contexto

A tabela `products` já tem campo `barcode` (text, nullable). Não existe índice unique por workspace. Não existe nenhuma biblioteca de scanning nem componente de scanner no projeto.

---

## 1. Base de Dados (1 migração)

Criar índice único parcial para evitar duplicados de barcode no mesmo workspace:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS products_workspace_barcode_unique_idx
  ON public.products (workspace_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';
```

Não são necessárias novas tabelas — o campo `barcode` já existe em `products` e `supplier_products`.

---

## 2. Dependências NPM

Instalar `html5-qrcode` — biblioteca leve que suporta EAN-13, UPC-A, Code 128, QR e usa a câmara nativa via MediaDevices API. Funciona em PWA/mobile.

---

## 3. Edge Functions (2)

### A) `barcode-lookup` (nova)
- Input: `workspace_id`, `barcode`
- Procura em `products` por barcode exact match no workspace
- Retorna: `{ found, product_id, name, sku, barcode, images, stock_on_hand, base_price }` ou `{ found: false }`
- `verify_jwt = false` (valida JWT no código)

### B) `barcode-external-lookup` (nova, opcional)
- Input: `barcode`
- Consulta Open Food Facts API (gratuita) ou UPCitemdb para obter nome, marca, imagem
- Retorna: `{ name, brand, image_url, category }` ou vazio
- Usado apenas no quick-create para pré-preencher dados

---

## 4. Componente Scanner Reutilizável

### `src/components/barcode/BarcodeScannerModal.tsx`
- Modal com 2 modos:
  - **Camera mode** (mobile): usa `html5-qrcode` com viewfinder e botão de flash
  - **Input mode** (desktop): campo de texto focado que captura input de scanner físico (stream rápido + Enter)
- Cooldown de 1s para evitar leituras duplicadas
- Vibração ao ler (navigator.vibrate)
- Props: `onScan(barcode: string)`, `open`, `onOpenChange`

### `src/components/barcode/BarcodeResultPanel.tsx`
- Após scan, mostra:
  - Se encontrado: card do produto (nome, imagem, stock) + botões "Adicionar +1", "Editar qty", "Abrir produto"
  - Se não encontrado: botão "Criar produto rápido" que abre o MQPCWizard/quick-create com barcode pré-preenchido

### `src/hooks/useBarcodeLookup.ts`
- Hook que chama `barcode-lookup` edge function
- Retorna `{ lookup, isLoading, result }`

---

## 5. Integrações por Módulo (botão Scan em cada zona)

### A) Produtos (`ProductsList` / formulário de criação)
- Botão scan no header da lista → ao encontrar, navega para o produto; se não existir, abre quick-create com barcode

### B) Stock / Inventário (`B2BStockPage`)
- Botão scan → ao encontrar, abre dialog de ajuste de stock com produto pré-selecionado

### C) Receção de Compras (`GoodsReceiptForm`)
- Botão scan junto aos items → incrementa qty recebida do item correspondente ou alerta se produto não está na PO

### D) Loja Online Admin (`StoreProductsAdminPage`)
- Botão scan → cria produto draft com barcode pré-preenchido

### E) RFQ Items (formulário de RFQ)
- Botão scan → adiciona item ao RFQ por barcode lookup

---

## 6. Ficheiros a criar/modificar

| Ficheiro | Ação |
|---|---|
| Migração SQL | Criar unique index `products_workspace_barcode_unique_idx` |
| `supabase/functions/barcode-lookup/index.ts` | Criar |
| `supabase/functions/barcode-external-lookup/index.ts` | Criar |
| `supabase/config.toml` | Registar 2 novas functions |
| `src/components/barcode/BarcodeScannerModal.tsx` | Criar — scanner camera + input mode |
| `src/components/barcode/BarcodeResultPanel.tsx` | Criar — resultado + ações |
| `src/hooks/useBarcodeLookup.ts` | Criar — hook de lookup |
| `src/components/products/ProductsList.tsx` | Adicionar botão scan |
| `src/pages/B2BStockPage.tsx` | Adicionar botão scan |
| `src/components/procurement/GoodsReceiptForm.tsx` | Adicionar botão scan |
| `src/components/procurement/PurchaseOrderForm.tsx` | Adicionar botão scan |

---

## 7. Segurança

- Edge functions validam JWT e workspace membership
- Índice unique impede duplicados de barcode por workspace
- RLS existente em `products` já filtra por workspace_id

