## Diagnóstico

Consegui reproduzir o problema em viewport mobile na rota `/dashboard/products`:

1. Ao clicar em **Criar produto**, o modal abre corretamente.
2. Ao clicar no botão de **câmara / scanner** dentro do modal, a aplicação sai do fluxo e vai para `/onboarding`.
3. O mesmo comportamento acontece ao clicar no botão **Scan código** no topo da página mobile de produtos.
4. Existem avisos de React relacionados com `BarcodeScannerModal`, `BarcodeResultPanel` e `MobileBottomNav` a receberem refs indevidos, sinal de que algum wrapper/slot está a tentar tratar estes componentes como elementos DOM diretos.
5. O fluxo mobile tem três caminhos concorrentes para criar/ler produto:
   - FAB global `MQPCFloatingButton` para `/mobile/products/quick-create`
   - botão `Criar produto` que abre `CreateProductDialog`
   - botão `Scan código` que abre `BarcodeScannerModal`

O erro anterior foi tratado só ao nível do posicionamento do FAB. Isso não cobre o problema real: os botões de scanner/câmara dentro da página/modal continuam a provocar uma troca de estado/rota, e o fluxo mobile continua fragmentado.

## Decisões de produto/UX

Vou estabilizar o fluxo mobile com uma regra simples:

- Em telemóvel, **Criar Produto** deve usar sempre o wizard mobile dedicado (`/mobile/products/quick-create`) em vez de abrir o modal desktop `CreateProductDialog`.
- O botão **Scan código** deve abrir o scanner sem interferir com onboarding, navegação inferior ou overlays.
- No preview Lovable, onde a câmara pode estar bloqueada por iframe, o scanner deve cair para modo manual de forma controlada, sem redirecionar.
- A rota `/mobile/products/quick-create` deve estar blindada dentro do layout/autenticação existente para não cair em onboarding por loading transitório.

## Estrutura técnica

### 1. Corrigir `MobileProductsView`
- Alterar `onCreate` no contexto mobile para navegar diretamente para `/mobile/products/quick-create`.
- Manter o modal `CreateProductDialog` para desktop/tablet, mas não como caminho principal no mobile.
- Garantir que os handlers `onClick` dos botões mobile usam `preventDefault` e `stopPropagation` quando necessário.

### 2. Corrigir `ProductsList`
- No branch mobile (`isMobile && activeTab === "products"`):
  - `onCreate` passa a navegar para o wizard mobile.
  - `onQuickCreate` deixa de usar `window.location.href` para uma rota inexistente `/mqpc` e passa a usar React Router para `/mobile/products/quick-create?barcode=...`.
  - Remover/evitar fluxos que provoquem reload completo da app.

### 3. Corrigir `MQPCWizard` para aceitar barcode inicial
- Ler `barcode` da query string.
- Se existir, pré-preencher o SKU no passo 1.
- Permitir continuar a pesquisa/IA a partir desse código sem perder estado.
- Substituir `navigate(-1)` no botão voltar por fallback seguro para `/dashboard/products` quando não houver histórico fiável.

### 4. Fortalecer `BarcodeScannerModal`
- Transformar o componente em `forwardRef` para eliminar o aviso “Function components cannot be given refs”.
- Tornar a abertura/fecho idempotente:
  - parar stream da câmara de forma segura;
  - limpar container sem causar erros DOM;
  - não disparar navegação nenhuma dentro do modal.
- Garantir fallback para modo manual em iframe/preview sem trocar de rota.
- Adicionar `onPointerDown/onClick` defensivo no botão de câmara quando usado dentro de modal.

### 5. Corrigir `BarcodeResultPanel`
- Aplicar `forwardRef` se estiver a ser tratado por Radix/Sheet/Dialog como elemento com ref.
- Corrigir `onQuickCreate` para usar navegação SPA, não `window.open`/`window.location.href`.

### 6. Reduzir risco de redirect falso para onboarding
- Rever `DashboardLayout`/`WorkspaceContext` para não redirecionar para `/onboarding` durante estados transitórios de carregamento/refresh de workspace.
- Se `workspaces.length === 0`, só redirecionar quando o carregamento terminou e já houve uma tentativa válida de carregar workspaces.
- Evitar que um evento de scanner/câmara faça remontar providers e reavaliar workspace como vazio.

## Plano de implementação

1. Atualizar `ProductsList.tsx`:
   - adicionar `useNavigate`;
   - criar `goToMobileQuickCreate(barcode?)`;
   - usar esse handler nos botões mobile de criar e no resultado do scanner;
   - remover `window.location.href` e `window.open` nos fluxos de quick create.

2. Atualizar `MobileProductsView.tsx`:
   - reforçar os handlers dos botões `Criar produto` e `Scan código` com eventos seguros;
   - evitar propagação para elementos fixos/overlays.

3. Atualizar `MQPCStepSKU.tsx` e/ou `MQPCWizard.tsx`:
   - aceitar SKU/barcode inicial por props ou query string;
   - pré-preencher input;
   - garantir navegação de volta segura para `/dashboard/products`.

4. Atualizar `BarcodeScannerModal.tsx`:
   - converter para `React.forwardRef`;
   - manter API atual (`open`, `onOpenChange`, `onScan`);
   - garantir fallback manual em preview;
   - impedir qualquer navegação/submit acidental.

5. Atualizar `BarcodeResultPanel.tsx`:
   - converter para `forwardRef` se necessário;
   - garantir que quick create navega para `/mobile/products/quick-create?barcode=...`.

6. Rever `DashboardLayout.tsx`/`WorkspaceContext.tsx`:
   - blindar o redirect para `/onboarding` contra estado transitório;
   - manter o comportamento correto para utilizadores realmente sem workspace.

## Critérios de aceitação

- Em mobile, clicar **Criar produto** abre o wizard mobile, não o dashboard/onboarding.
- Em mobile, clicar **Scan código** abre scanner/manual fallback, não muda de rota.
- Dentro do modal de produto, clicar na câmara não manda a app para `/onboarding` nem `/dashboard`.
- No preview Lovable, se a câmara estiver bloqueada, aparece modo manual com mensagem clara.
- Em app publicada/domínio próprio, o scanner deve tentar usar a câmara real.
- O quick create com barcode deve preservar o código no wizard.
- Sem warnings de ref relacionados com `BarcodeScannerModal`, `BarcodeResultPanel` e `MobileBottomNav`.
- Sem navegação via `window.location.href`/`window.open` nos fluxos internos SPA.
- Testado em mobile 390x844 e desktop para não quebrar o modal desktop.

## Riscos e pontos por validar

- A câmara real não pode ser totalmente validada no preview Lovable se estiver em iframe; será validado o fallback manual e a ausência de redirects.
- Se o utilizador estiver mesmo sem workspace, o redirect para onboarding deve continuar a acontecer corretamente.
- Se houver cookies/banner a sobrepor botões em mobile, poderá ser necessário ajustar z-index/posição, mas isso é secundário ao bug principal de navegação.