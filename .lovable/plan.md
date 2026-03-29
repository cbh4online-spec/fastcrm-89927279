

# Fix: Slug duplicado ao criar eBook

## Diagnóstico

O `useCreateEbook` gera o slug deterministicamente a partir do título (`input.title.toLowerCase().replace(...)`) sem verificar se já existe. Ao criar dois eBooks com o mesmo título no mesmo workspace, o slug é idêntico e viola a constraint `ebooks_slug_workspace_idx`.

O mesmo problema existe em `useEbookTemplates.ts`.

## Correção

**Ficheiros:** `src/hooks/useEbooks.ts`, `src/hooks/useEbookTemplates.ts`

Após gerar o slug base, adicionar um sufixo único (timestamp curto em base36) para garantir unicidade:

```typescript
const baseSlug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
const slug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`;
```

Isto garante:
- Slugs legíveis (`meu-ebook-k8f2x`)
- Sempre únicos (timestamp base36)
- Sem query extra ao DB para verificar duplicados
- Mesmo padrão aplicado a ebook_templates

