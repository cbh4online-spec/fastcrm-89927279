

## Adicionar assunto e nome do destinatário ao inserir link de pagamento

### O que muda

Quando se insere um link de pagamento no email, além do texto contextual já existente, o sistema vai:

1. **Dirigir-se ao destinatário pelo nome** no texto introdutório (ex: "Caro Daniel,")
2. **Sugerir automaticamente o assunto** do email (ex: "Link de Pagamento - Desenvolvimento há medida")

### Alterações

| Ficheiro | Detalhe |
|---|---|
| `InsertPaymentLinkDialog.tsx` | Receber `recipientName` e `onSubjectSuggestion` como props. Pre-preencher o texto com saudação personalizada. Adicionar campo editável para assunto sugerido. |
| `ComposeEmailDialog.tsx` | Passar `recipient.name` e callback para atualizar o assunto ao `InsertPaymentLinkDialog` |

### Resultado

```text
Assunto sugerido: "Link de Pagamento - Desenvolvimento há medida"

Texto no email:
  "Caro Daniel,
   Segue o link para efetuar o pagamento de Desenvolvimento há medida:"
  [Card de pagamento]
```

O utilizador pode editar tanto o assunto como o texto antes de inserir. O assunto só é aplicado se o campo estiver vazio (não sobrescreve assuntos já preenchidos).

