

# Fix: Módulo Procurement no Marketplace

## Problema

O marketplace usa um array hardcoded `SAMPLE_MODULES` em `src/types/marketplace.ts` para listar módulos. O procurement foi inserido na DB mas nunca foi adicionado a esse array. Além disso, a categoria `operations` usada na migração não existe no tipo `ModuleCategory`.

## Solução

### 1. Adicionar categoria "operations" ao tipo `ModuleCategory` (`src/types/marketplace.ts`)
- Adicionar `| "operations"` ao tipo
- Adicionar entrada em `CATEGORY_INFO` com nome "Operações", icon "Settings", cor teal

### 2. Adicionar procurement ao `SAMPLE_MODULES` (`src/types/marketplace.ts`)
Adicionar entrada com:
- `id: "procurement"`, `slug: "procurement"`
- `name: "Purchase & Procurement"`
- `category: "operations"`
- `internal_type: "native_feature"`
- `is_featured: true`, `is_new: true`
- Pricing free
- Target audience, expected results e use cases relevantes

### 3. Adicionar `NOTIFY pgrst, 'reload schema'` via migração
Garantir que o PostgREST reconhece o módulo inserido na DB.

## Ficheiros a modificar
1. `src/types/marketplace.ts` — adicionar categoria + módulo ao SAMPLE_MODULES
2. **Migração SQL** — `NOTIFY pgrst, 'reload schema'`

