

## Corrigir visibilidade do texto no preview do compositor de email

### Causa raiz

O HTML do email (texto do corpo, card de pagamento, assinatura) usa **cores inline hardcoded** para fundo claro (ex: `color: #374151`, `color: #1f2937`). No modo escuro, o container do preview muda para `bg-gray-950` mas as cores inline não podem ser sobrescritas pelo Tailwind `prose-invert` — CSS inline tem prioridade máxima.

### Solução

O preview de email deve **sempre usar fundo branco**, independentemente do tema da app. Emails são sempre renderizados em fundo branco pelos clientes de email — o preview deve refletir isso.

### Alteração

| Ficheiro | Detalhe |
|---|---|
| `ComposeEmailDialog.tsx` (linha 632-633) | Remover `dark:bg-gray-950`, `dark:text-gray-100`, `dark:prose-invert` e manter apenas `bg-white text-gray-900`. O preview passa a ser sempre claro, fiel à renderização real do email. |

### Resultado

O preview mostra o email exatamente como o destinatário o vai ver — fundo branco com texto escuro legível, em qualquer tema.

