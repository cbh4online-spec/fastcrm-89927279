

# Fix Kernel Monitor — Menu Lateral

## Diagnóstico

A página **já usa `DashboardLayout`** que inclui o sidebar e o TopBar. O problema visual na pré-visualização deve-se a:

1. **Padding duplicado**: O `DashboardLayout` já aplica `p-4 md:p-6` no `<main>`, e a página adiciona outro `p-6` redundante — isto empurra o conteúdo e pode causar overflow
2. **Viewport estreito**: Na janela de preview, o sidebar colapsa (comportamento responsivo normal para `< lg`), mas o TopBar com o menu hamburger deve estar visível

## Correção

### Ficheiro: `src/pages/KernelMonitorPage.tsx`
- **Remover o `p-6` redundante** da div wrapper (o DashboardLayout já fornece padding)
- Confirmar que não há early returns que saltem o `DashboardLayout`

Alteração mínima — apenas remover o padding duplicado na linha 121:
```
// De:
<div className="space-y-6 p-6 max-w-7xl mx-auto animate-fade-in">
// Para:
<div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
```

O sidebar e TopBar já estão presentes no layout — a correcção garante que o conteúdo não transborda e o menu hamburger (mobile) fica acessível.

