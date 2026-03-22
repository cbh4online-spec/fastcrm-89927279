

# Suporte para Múltiplas Colunas de Imagens na Importação

## Problema

O sistema de mapeamento só permite mapear **uma** coluna como "URL da Imagem". CSVs com colunas como `image_url_2`, `image_url_3`, `foto_extra` não são reconhecidos como imagens adicionais.

O código backend (`useCreateProductsBatch`) já suporta `image_urls: string[]` e cria múltiplos registos em `product_images`. O problema é apenas no mapeamento do CSV.

## Solução

### 1. Adicionar campos de imagem extra ao SYSTEM_FIELDS

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

Adicionar ao array `SYSTEM_FIELDS`:
```
{ key: "image_url_2", label: "URL Imagem 2" },
{ key: "image_url_3", label: "URL Imagem 3" },
{ key: "image_url_4", label: "URL Imagem 4" },
{ key: "image_url_5", label: "URL Imagem 5" },
```

### 2. Adicionar padrões de auto-mapeamento

No array `AUTO_MAP_PATTERNS`, adicionar regex para detetar automaticamente colunas como `image_2`, `foto_2`, `image_url_2`, etc.:
```
[/^(image.?2|img.?2|imagem.?2|foto.?2|photo.?2|url_image.?2)$/i, "image_url_2"],
[/^(image.?3|img.?3|imagem.?3|foto.?3|photo.?3|url_image.?3)$/i, "image_url_3"],
[/^(image.?4|img.?4|imagem.?4|foto.?4|photo.?4|url_image.?4)$/i, "image_url_4"],
[/^(image.?5|img.?5|imagem.?5|foto.?5|photo.?5|url_image.?5)$/i, "image_url_5"],
```

### 3. Processar imagens extras no confirmMapping

No switch de mapeamento (linha ~431), adicionar cases para `image_url_2` a `image_url_5` que empurram para o mesmo array `itemData.imageUrls`:
```ts
case "image_url_2":
case "image_url_3":
case "image_url_4":
case "image_url_5": {
  if (val.trim()) {
    if (!itemData.imageUrls) itemData.imageUrls = [];
    itemData.imageUrls.push(val.trim());
  }
  break;
}
```

Sem alterações necessárias no hook `useCreateProductsBatch` — já suporta `image_urls: string[]`.

## Ficheiros Modificados
- `src/components/products/BatchSKUImportDialog.tsx` — SYSTEM_FIELDS, AUTO_MAP_PATTERNS, e switch de mapeamento

