
# Branding com IA e Upload de Logotipo

## O que muda

### Tab Branding (StoreSettingsPage)
Atualmente, os campos de logo e banner sao apenas inputs de texto para colar URLs. Vamos transformar esta secao:

1. **Logotipo -- Upload de ficheiro**: Substituir o campo "URL do Logo" por um componente de upload visual (drag-and-drop ou clique para selecionar). O ficheiro e enviado para o bucket `company-logos` e o URL publico e guardado em `logo_url`.

2. **Banner -- Upload de ficheiro + Gerar com IA**: Substituir o campo "URL do Banner" por upload visual, com um botao adicional "Gerar com IA" que cria um banner fotorealista usando o modo `generate-store-banner` na edge function.

3. **Cores -- Sugestao com IA**: Adicionar um botao "Sugerir cores com IA" que analisa o nome e descricao da loja e propoe uma paleta de cores (primaria + destaque).

## Seccao Tecnica

### Migracao SQL
Criar bucket de storage para assets da loja (se nao existir):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: utilizadores autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload store assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can update store assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'store-assets');

CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can delete store assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'store-assets');
```

### Edge function -- novos modos

Adicionar ao `ai-product-assistant/index.ts`:

| Modo | Input | Output |
|---|---|---|
| `generate-store-banner` | `storeName`, `category?`, `description?` | `imageBase64` (banner 16:9 fotorealista) |
| `suggest-brand-colors` | `storeName`, `description?`, `category?` | `{ primaryColor: "#hex", accentColor: "#hex", rationale: "..." }` |

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/pages/StoreSettingsPage.tsx` | Redesenhar tab Branding: upload de logo com preview + upload de banner com preview e botao IA + botao IA para cores |
| `supabase/functions/ai-product-assistant/index.ts` | Adicionar modos `generate-store-banner` e `suggest-brand-colors` |
| Migracao SQL | Criar bucket `store-assets` com RLS |

### UI da tab Branding (redesenhada)

```text
+------------------------------------------+
| Logotipo                                 |
| +----------+  [Escolher ficheiro]        |
| | preview  |  Formatos: PNG, JPG, SVG    |
| | da logo  |  Max: 2MB                   |
| +----------+  [Remover]                  |
+------------------------------------------+
| Banner                                   |
| +--------------------------------+       |
| |    preview do banner           |       |
| +--------------------------------+       |
| [Escolher ficheiro]  [Gerar com IA]      |
+------------------------------------------+
| Cores                                    |
| Cor Primaria    Cor de Destaque           |
| [#____] [_]     [#____] [_]              |
|           [Sugerir cores com IA]         |
+------------------------------------------+
```

### Logica de upload (logo e banner)

```text
1. Utilizador seleciona ficheiro ou faz drag-and-drop
2. Valida tipo (image/*) e tamanho (max 2MB)
3. Upload para bucket store-assets/{workspaceId}/logo.ext ou banner.ext
4. Obtem URL publico
5. Atualiza form.logo_url ou form.banner_url
6. Preview atualiza imediatamente
```

### Logica de geracao do banner com IA

```text
1. Clique em "Gerar com IA"
2. Valida que o nome da loja esta preenchido
3. Chama edge function modo generate-store-banner
4. Recebe imageBase64
5. Converte para blob e faz upload para store-assets
6. Atualiza form.banner_url com URL publico
```
