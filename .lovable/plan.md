

# Plano: Ações aplicáveis na Pesquisa de Mercado

## Problema
A vista de Pesquisa de Mercado no `AIStrategyDialog` mostra dados (gaps, features essenciais, oportunidades de diferenciação) mas é apenas informativa — não permite aplicar nenhuma sugestão aos planos existentes.

## O que vamos construir
Adicionar checkboxes/seleção nas 3 secções acionáveis da Pesquisa de Mercado (Gaps de Pricing, Features Essenciais, Oportunidades) com um painel de ações que permite:
1. **Adicionar features selecionadas** a um plano específico (START/GROW/PRO)
2. **Copiar seleção** para clipboard como lista
3. **Criar nota/tarefa** a partir das oportunidades selecionadas

## Alterações

### `src/components/super-admin/AIStrategyDialog.tsx`

**MarketResearchView** — transformar de read-only para interativo:

- Adicionar `useState` para itens selecionados (gaps, must-haves, oportunidades) via checkboxes
- Adicionar barra de ação fixa no fundo quando há itens selecionados: 
  - **Dropdown "Adicionar ao Plano"** → START / GROW / PRO — chama `onApplyFeatures(planKey, selectedItems)`
  - **Botão "Copiar Seleção"** → clipboard
- Aceitar a prop `onApplyFeatures` (já existente no dialog mas não passada ao `MarketResearchView`)

### `AIStrategyDialogProps` e passagem de props
- Passar `onApplyFeatures` para o `MarketResearchView`

### Fluxo do utilizador
1. Executa "Pesquisa de Mercado" via dropdown
2. Dialog abre com resultados
3. Seleciona features essenciais e oportunidades via checkboxes
4. Clica "Adicionar ao Plano → GROW"
5. Features são adicionadas ao plano GROW via `onApplyFeatures`
6. Toast de confirmação

### Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `src/components/super-admin/AIStrategyDialog.tsx` | Adicionar checkboxes, barra de ação, e lógica de seleção ao `MarketResearchView` |

Nenhuma alteração backend necessária — reutiliza o `onApplyFeatures` já existente.

