

## Problemas identificados

1. **"Método Vision" não existe no `SAMPLE_MODULES`** — está na base de dados com category `strategy`, mas falta no array hardcoded em `src/types/marketplace.ts`. Além disso, `strategy` não é uma `ModuleCategory` válida.

2. **Contagens de categorias desalinhadas com o tab ativo** — O `moduleCounts` conta TODOS os módulos independentemente do tab. Quando o tab "Extensões" está ativo, os módulos são filtrados por `extensionSlugs` (apenas os que têm manifest), mas os badges de categoria continuam a mostrar contagens do total. Resultado: selecionar "Prospecção (4)" no tab Extensões mostra 0 módulos.

---

## Plano de correção

### 1. Adicionar categoria `strategy` ao tipo `ModuleCategory`
- Adicionar `"strategy"` ao union type `ModuleCategory`
- Adicionar entrada em `CATEGORY_INFO` com nome "Estratégia", icon `Target`, cor `text-rose-500`

### 2. Adicionar "Método Vision" ao `SAMPLE_MODULES`
- Novo entry com `id: "metodo-vision"`, `slug: "metodo-vision"`, `category: "strategy"`, dados consistentes com o módulo na DB

### 3. Corrigir `moduleCounts` para respeitar o tab ativo
- Em `Marketplace.tsx`, o `moduleCounts` deve ser calculado sobre os módulos **já filtrados pelo tab** (não sobre `SAMPLE_MODULES` inteiro)
- Mover o cálculo para depender de `activeTab`, `extensionSlugs` e `installedModuleIds`

### 4. Adicionar `"strategy"` ao objeto de contagens
- No `moduleCounts`, adicionar `strategy: 0` ao objeto inicial

### Ficheiros a editar
- `src/types/marketplace.ts` — adicionar category + CATEGORY_INFO + SAMPLE_MODULE entry
- `src/pages/Marketplace.tsx` — corrigir `moduleCounts` para ser contextual ao tab

