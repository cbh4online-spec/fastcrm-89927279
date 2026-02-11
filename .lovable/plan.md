

# Adicionar Contagem de Módulos ao Banner do Marketplace

## O que vou fazer

Adicionar contadores visuais ao header/banner da página do Marketplace, mostrando estatísticas como:
- Total de módulos disponíveis
- Módulos instalados
- Módulos novos

## Ficheiro a Alterar

| Ficheiro | Alteração |
|---|---|
| `src/pages/Marketplace.tsx` | Adicionar badges/contadores no header, abaixo da descrição |

## Implementação

No header do Marketplace (zona do gradiente), após o parágrafo de descrição e antes do campo de pesquisa, adicionar uma row com 3 indicadores visuais:

- **Total**: `SAMPLE_MODULES.length` módulos disponíveis
- **Instalados**: `installedModuleIds.length` módulos ativos
- **Novos**: contagem dos módulos com `is_new: true`

Cada indicador será um pequeno badge/chip com ícone e número, alinhados horizontalmente, usando estilos consistentes com o design existente (cores muted, ícones lucide).

