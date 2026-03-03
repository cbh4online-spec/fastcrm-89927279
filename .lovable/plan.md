

# Tornar Campos do RFQ Editáveis em Todos os Estados

## Problema
Os campos (Data Limite, Cond. Pagamento, Local Entrega, Incoterm, Validade Proposta, Moeda) só são editáveis quando o RFQ está em `draft`. Em qualquer outro estado (`sent`, `receiving_quotes`, etc.) mostram texto estático.

## Solução
Remover a restrição `isDraft` dos campos editáveis no `RFQDetailPage.tsx`, permitindo edição inline em **qualquer estado** (exceto `awarded` e `closed`, onde o RFQ já está finalizado).

### Alterações

**Ficheiro: `src/pages/procurement/RFQDetailPage.tsx`**

1. Substituir a condição `isDraft` por uma nova variável `isEditable` que permite edição em todos os estados exceto `awarded` e `closed`:
   ```typescript
   const isEditable = !["awarded", "closed"].includes(rfq.status);
   ```

2. Substituir todas as referências a `isDraft` nos campos editáveis (Data Limite, Cond. Pagamento, Local Entrega, Incoterm, Validade Proposta, Moeda) por `isEditable`.

Isto afeta ~6 blocos condicionais no card de informações do RFQ (linhas 231-338), onde `isDraft ?` passa a `isEditable ?`.

### Hook `useUpdateRFQ`
Já funciona para qualquer estado — não precisa de alterações.

