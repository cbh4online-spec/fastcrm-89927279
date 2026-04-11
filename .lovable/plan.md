

## Diagnóstico

A página `MarketplaceConfigPage` é renderizada como página standalone, sem o layout/navegação do marketplace C2C. As rotas já existem em `C2CRoutes.tsx` (`/dashboard/c2c/config` e `/dashboard/marketplace/config`), mas a página não partilha o visual das outras páginas C2C.

## Plano

### 1. Integrar MarketplaceConfigPage no layout C2C
- Mover o ficheiro de `src/pages/dashboard/marketplace/` para `src/pages/c2c/` (ou criar wrapper)
- Adicionar o mesmo header/breadcrumb e navegação lateral que as outras páginas C2C admin usam (ex: `C2CMarketplaceAnalytics`, `C2CSellersAdmin`)
- Manter a mesma estrutura de tabs existente (Geral, Aparência, Comissões, SEO, etc.)

### 2. Navegação consistente
- Garantir que o link de configuração no menu lateral do marketplace aponta para `/dashboard/c2c/config`
- A rota `/dashboard/marketplace/config` continua a funcionar como alias

### Ficheiros a editar
| Ficheiro | Ação |
|---|---|
| `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx` | Adicionar header/breadcrumb consistente com layout C2C |

### Critérios de aceitação
- A página de configuração tem o mesmo aspecto visual das outras páginas admin do C2C
- Navegação de volta ao marketplace funciona
- Todas as funcionalidades existentes (tabs, formulários, save) mantêm-se

