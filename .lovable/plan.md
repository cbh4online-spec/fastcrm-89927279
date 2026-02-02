
# Plano: Adicionar Preview Full-Screen do Documento Final

## Contexto Actual

O sistema já tem:
- **ProposalViewToggle** com modos "Gestão" e "Documento"
- **ProposalClientDocument** - o documento formatado para o cliente
- Botões de "Imprimir" e "Download PDF" no documento

O que falta é um **botão de preview dedicado** que abre o documento em ecrã cheio, simulando exactamente o que o cliente vai ver antes de enviar.

---

## Solução Proposta

### Criar um Dialog Full-Screen de Preview

Um novo botão "Pré-visualizar Documento" que abre um dialog a ocupar o ecrã inteiro, mostrando o `ProposalClientDocument` sem distrações - exactamente como o cliente irá ver.

---

## Implementação

### 1. Criar Componente `ProposalDocumentPreviewDialog.tsx`

Novo componente que:
- Abre em full-screen (ocupa toda a janela)
- Mostra o `ProposalClientDocument` centrado
- Inclui botões de acção: Imprimir, Download PDF, Fechar
- Background neutro para simular contexto do cliente
- Indicador "Pré-visualização - Assim ficará para o cliente"

```text
Estrutura:
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Fechar                     Pré-visualização do Documento         🖨 📄 ❌ │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                     ┌────────────────────────────────────┐                   │
│                     │                                    │                   │
│                     │    [ProposalClientDocument]        │                   │
│                     │                                    │                   │
│                     │    - Logo + Info Empresa           │                   │
│                     │    - Dados Cliente                 │                   │
│                     │    - Tabela de Itens               │                   │
│                     │    - Totais + IVA                  │                   │
│                     │    - Condições de Pagamento        │                   │
│                     │    - Assinatura                    │                   │
│                     │                                    │                   │
│                     └────────────────────────────────────┘                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2. Adicionar Botão no `ProposalDetailDialog.tsx`

Na barra de acções do header (junto a "Publicar"), adicionar:

```typescript
<Button 
  variant="outline" 
  onClick={() => setShowDocumentPreview(true)}
>
  <FileSearch className="h-4 w-4 mr-2" />
  Pré-visualizar Documento
</Button>
```

O botão fica visível:
- Sempre que há itens na proposta
- Independentemente do status (draft, published, etc.)

---

## Ficheiros a Criar/Modificar

### Novo Ficheiro: `src/components/proposals/ProposalDocumentPreviewDialog.tsx`

| Elemento | Descrição |
|----------|-----------|
| Dialog full-screen | Usa `DialogPrimitive.Content` com `className="fixed inset-0"` |
| Header fixo | Título + botões de acção (Imprimir, Download, Fechar) |
| ScrollArea | Área scrollable com o documento centrado |
| ProposalClientDocument | Renderizado com `showActions={false}` |
| Background | Cinza neutro para simular contexto web |

```typescript
// Estrutura do componente
interface ProposalDocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  items: PreviewItem[];
  workspace: WorkspaceData | null;
}
```

### Modificar: `src/components/proposals/ProposalDetailDialog.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Novo estado | `showDocumentPreview: boolean` |
| Novo import | `ProposalDocumentPreviewDialog`, `FileSearch` icon |
| Botão no header | "Pré-visualizar Documento" junto aos outros botões |
| Renderizar dialog | `<ProposalDocumentPreviewDialog ... />` no final |

---

## Funcionalidades do Preview

1. **Visualização exacta** - O documento aparece exactamente como o cliente verá
2. **Sem distracções** - Full-screen remove elementos da interface de gestão
3. **Acções rápidas**:
   - **Imprimir** - Abre diálogo de impressão do browser
   - **Download PDF** - Gera e descarrega PDF
   - **Fechar** - Volta ao diálogo de detalhes
4. **Indicador visual** - Banner a indicar "Esta é uma pré-visualização"

---

## Fluxo de Utilização

```text
1. Utilizador abre proposta → ProposalDetailDialog
2. Clica "Pré-visualizar Documento"
3. Abre ProposalDocumentPreviewDialog (full-screen)
4. Vê exactamente como o cliente receberá
5. Pode imprimir/download ou fechar
6. Ao fechar, volta ao ProposalDetailDialog
7. Se satisfeito, clica "Publicar" para enviar
```

---

## Estimativa

| Ficheiro | Linhas |
|----------|--------|
| ProposalDocumentPreviewDialog.tsx (novo) | ~120 linhas |
| ProposalDetailDialog.tsx (modificar) | ~15 linhas |
| **Total** | ~135 linhas |
