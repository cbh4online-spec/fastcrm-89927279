

# Plano: Corrigir Design Desalinhado da Página Gestores

## Diagnóstico

Analisando o screenshot e o código, identifico estes problemas visuais:

1. **KPIs em 5 colunas estão comprimidos** — A grid `grid-cols-2 md:grid-cols-5` força 5 cards numa linha em ecrãs médios, cortando o card "Não Atribuídos" à direita. Deve ser `md:grid-cols-3 lg:grid-cols-5` para melhor responsividade.

2. **Header desalinhado** — O título "Gestores" e o botão "Atribuir Entidades" usam `flex justify-between` mas sem `flex-wrap`, o que pode causar overflow em viewports menores.

3. **Container `max-w-7xl` inconsistente** — Outras páginas do dashboard usam `p-6 space-y-5` directamente sem `max-w-7xl mx-auto`. Ao adicionar este constraint, o conteúdo fica mais estreito que o esperado pelo layout do `DashboardLayout` (que já tem `p-4 md:p-6`).

4. **Padding duplicado** — O `DashboardLayout` já aplica `p-4 md:p-6` no `<main>`. A página adiciona `max-w-7xl mx-auto` mas não precisa de padding extra.

## Implementação

### Ficheiro: `src/pages/dashboard/GestoresPage.tsx`

1. **Remover `max-w-7xl mx-auto`** do container principal (list view e detail view) — seguir padrão das outras páginas que usam `space-y-6` directamente.

2. **Ajustar grid dos KPIs** — Mudar de `grid-cols-2 md:grid-cols-5` para `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` para dar mais espaço em ecrãs médios.

3. **Adicionar `flex-wrap gap-3`** ao header para evitar overflow do botão "Atribuir Entidades".

4. **Ajustar grid dos manager cards** — Garantir `gap-4` consistente e que os cards não fiquem demasiado largos.

5. **Detail view** — Mesmo tratamento: remover `max-w-7xl mx-auto`, usar `space-y-6` directamente.

## Critérios de Aceitação

- KPIs legíveis e sem corte em viewports de 1554px
- Header com título e botão correctamente alinhados
- Cards dos gestores com espaçamento consistente
- Layout consistente com as restantes páginas do dashboard

