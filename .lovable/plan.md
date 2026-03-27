

## Melhorar visibilidade do texto no compositor de email

### Problema

Na aba "Preview" do compositor, o texto do corpo do email (saudação, descrição do link de pagamento) aparece com baixo contraste, difícil de ler no tema escuro.

### Causa

- A textarea (aba "Escrever") usa `bg-background` sem cor de texto explícita — depende do tema
- O preview usa `bg-white dark:bg-gray-950` com `prose dark:prose-invert`, mas o texto fica cinzento em vez de branco

### Alterações

| Ficheiro | Detalhe |
|---|---|
| `ComposeEmailDialog.tsx` (linha 624-629) | Adicionar `text-foreground` à textarea para garantir contraste no modo escuro |
| `ComposeEmailDialog.tsx` (linha 632-633) | Forçar cor de texto no preview: `dark:text-gray-100` e usar classes prose mais explícitas para garantir legibilidade |

### Resultado

Texto do email claramente legível tanto na aba "Escrever" como na aba "Preview", em ambos os temas (claro e escuro).

