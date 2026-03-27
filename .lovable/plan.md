

## Substituir todos os mailto: pelo compositor interno de email

### Problema
O botão de email nas páginas de detalhe de Lead, Contacto e no painel EntityDetailsPanel ainda usa `mailto:` que abre o cliente externo. Deve abrir o `ComposeEmailDialog` interno, tal como já foi feito nas oportunidades.

### Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/crm/LeadDetail.tsx` | Substituir `<a href="mailto:...">` (linha 211) por botão que abre `ComposeEmailDialog` com dados do lead |
| `src/components/contacts/ContactDetail.tsx` | Substituir os 2 botões `mailto:` (linhas 423 e 962) por botão que abre `ComposeEmailDialog` com dados do contacto |
| `src/components/entity/EntityDetailsPanel.tsx` | No fallback sem `onEmailClick` (linha 145), usar o mesmo padrão interno em vez de `mailto:` |
| `src/components/contacts/ContactInsightsPanel.tsx` | Substituir `window.open(mailto:...)` (linha 129) pelo compositor interno |

### Padrão de implementação

Cada componente recebe um `useState` para controlar o dialog e renderiza o `ComposeEmailDialog` com:
- `recipient`: `{ email, name, entityType: 'lead'|'contact', entityId }`
- `defaultSubject`: vazio (ou nome do lead/contacto)

Exemplo para `LeadDetail.tsx`:
```text
// Substituir <a href="mailto:..."> por:
<Button onClick={() => setShowEmailDialog(true)}>
  <Mail /> 
</Button>

// Adicionar no final:
<ComposeEmailDialog
  open={showEmailDialog}
  onOpenChange={setShowEmailDialog}
  recipient={{ email: lead.email, name: lead.name, entityType: 'lead', entityId: lead.id }}
/>
```

O mesmo padrão aplica-se aos outros ficheiros. Nenhuma alteração de base de dados necessária.

