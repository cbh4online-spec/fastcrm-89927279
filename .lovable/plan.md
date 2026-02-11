

# Corrigir visibilidade dos módulos no menu lateral

## Problema

Os grupos de navegacao **Portal B2B**, **Loja Online**, **Marketplace C2C**, **FastClub** e o item **Email Marketing** aparecem sempre no menu lateral, independentemente de estarem ou nao instalados. Isto acontece porque estes grupos/itens nao tem a propriedade `moduleSlug` definida, ao contrario de "Credito" e "Student Journey" que funcionam correctamente.

## Solucao

Adicionar `moduleSlug` a cada grupo e item relevante no ficheiro `src/components/layout/Sidebar.tsx`:

| Grupo/Item | moduleSlug a adicionar |
|---|---|
| Portal B2B (grupo inteiro) | `b2b-portal` |
| Loja Online (grupo inteiro) | `online-store` |
| Marketplace C2C (grupo inteiro) | `marketplace-c2c` |
| FastClub (grupo inteiro) | `fastclub` |
| Email Marketing (item dentro de Marketing) | `email-campaigns` |

Quando `moduleSlug` esta definido num grupo, a logica existente no Sidebar (linhas 337-354) ja esconde o grupo/item automaticamente se o slug nao estiver em `installedModuleIds`. Portanto, nao e necessario alterar nenhuma logica -- apenas adicionar a propriedade aos grupos/itens corretos.

## Secao Tecnica

### Ficheiro a alterar

**`src/components/layout/Sidebar.tsx`** -- Adicionar `moduleSlug` a 5 locais:

1. Grupo "Portal B2B" (linha ~196): adicionar `moduleSlug: "b2b-portal"`
2. Grupo "Loja Online" (linha ~208): adicionar `moduleSlug: "online-store"`
3. Grupo "Marketplace C2C" (linha ~223): adicionar `moduleSlug: "marketplace-c2c"`
4. Grupo "FastClub" (linha ~238): adicionar `moduleSlug: "fastclub"`
5. Item "Email Marketing" (linha ~256): adicionar `moduleSlug: "email-campaigns"`

Nao e necessario alterar mais nenhum ficheiro. A logica de filtragem ja existe e funciona correctamente para os modulos que ja tem `moduleSlug` (ex: Credito, Student Journey).

