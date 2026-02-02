

# Plano: Incluir Âmbito, Cronograma, Condições e Referências no Documento de Proposta

## Problema Identificado

O wizard de criação de proposta tem 6 secções:
1. **Itens** ✓ (aparece no documento)
2. **Âmbito** ✗ (não aparece)
3. **Cronograma** ✗ (não aparece)
4. **Condições** ✗ (não aparece - apenas label básico)
5. **Referências** ✗ (não aparece)
6. **Cliente** ✓ (dados básicos aparecem)

Os dados de âmbito, cronograma e referências são guardados em colunas JSONB na tabela `proposals` (`scope_data`, `timeline_data`, `references_data`), mas o componente `ProposalClientDocument` não os renderiza.

## Solução

Expandir o documento de proposta para incluir todas as secções do wizard, criando uma experiência de documento profissional completo.

## Implementação

### 1. Actualizar Interface do ProposalClientDocument

Adicionar novas props para receber os dados adicionais:

```typescript
interface ProposalClientDocumentProps {
  proposal: Proposal;
  items?: PreviewItem[];
  workspace?: WorkspaceData | null;
  // Novas props
  scopeData?: ScopeData;
  timelineData?: TimelineData;
  referencesData?: ReferencesData;
  // ...
}
```

### 2. Adicionar Secções ao Documento (ProposalClientDocument.tsx)

#### Secção Âmbito (após a tabela de itens)
```text
┌─────────────────────────────────────────────────┐
│ ÂMBITO DO PROJECTO                              │
├─────────────────────────────────────────────────┤
│ Objectivos                                       │
│ [Texto dos objectivos]                           │
├─────────────────────────────────────────────────┤
│ ✓ Entregáveis                                    │
│   • Item 1                                       │
│   • Item 2                                       │
├─────────────────────────────────────────────────┤
│ ✗ Exclusões                                      │
│   • Item excluído 1                              │
├─────────────────────────────────────────────────┤
│ ⚠ Pressupostos                                  │
│ [Texto dos pressupostos]                         │
└─────────────────────────────────────────────────┘
```

#### Secção Cronograma
```text
┌─────────────────────────────────────────────────┐
│ CRONOGRAMA                                       │
├─────────────────────────────────────────────────┤
│ Duração Total: X semanas                         │
├─────────────────────────────────────────────────┤
│ Semana │ Fase/Marco          │ Duração          │
│   1    │ Fase 1: Análise     │ 7 dias           │
│   2    │ ⚑ Marco: Kickoff    │ -                │
│   3    │ Fase 2: Desenvolvimento │ 14 dias      │
└─────────────────────────────────────────────────┘
```

#### Secção Referências
```text
┌─────────────────────────────────────────────────┐
│ REFERÊNCIAS E CREDENCIAIS                        │
├─────────────────────────────────────────────────┤
│ Projectos Similares                              │
│ [Cards com título + descrição]                   │
├─────────────────────────────────────────────────┤
│ "Citação do testemunho..."                       │
│ — Autor, Cargo @ Empresa                         │
├─────────────────────────────────────────────────┤
│ Certificações: [Badge] [Badge] [Badge]           │
└─────────────────────────────────────────────────┘
```

### 3. Actualizar ProposalDocumentPreviewDialog

Passar os dados do scope, timeline e references para o documento:

```typescript
<ProposalDocumentPreviewDialog
  open={showDocumentPreview}
  onOpenChange={setShowDocumentPreview}
  proposal={proposal}
  items={proposalItems}
  workspace={workspace}
  scopeData={scopeData}      // Novo
  timelineData={timelineData} // Novo
  referencesData={referencesData} // Novo
/>
```

### 4. Actualizar ProposalDetailDialog

Extrair e passar os dados JSONB da proposta para o preview dialog.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProposalClientDocument.tsx` | Adicionar renderização das 4 novas secções |
| `src/components/proposals/ProposalDocumentPreviewDialog.tsx` | Aceitar e passar as novas props |
| `src/components/proposals/ProposalDetailDialog.tsx` | Passar `scopeData`, `timelineData`, `referencesData` ao preview |

## Estrutura do Documento Final

O documento terá a seguinte ordem de secções:

1. **Cabeçalho** - Logo, dados da empresa, número da proposta
2. **Dados do Cliente** - Nome, morada, NIF
3. **Tabela de Itens** - Produtos/serviços com preços
4. **Totais** - Subtotal, IVA, Total
5. **Âmbito do Projecto** - Objectivos, entregáveis, exclusões *(NOVO)*
6. **Cronograma** - Fases e marcos temporais *(NOVO)*
7. **Referências** - Projectos similares, testemunho, certificações *(NOVO)*
8. **Rodapé** - Condições de pagamento, validade, assinatura

## Renderização Condicional

Cada secção só aparece se tiver conteúdo:
- Âmbito: Se `scopeData.objectives` ou `scopeData.deliverables.length > 0`
- Cronograma: Se `timelineData.phases.length > 0`
- Referências: Se `referencesData.projects.length > 0` ou testemunho preenchido

## Resultado Esperado

O documento de proposta passará a mostrar todas as informações inseridas no wizard, criando uma proposta comercial completa e profissional que inclui:
- Lista de produtos/serviços com preços
- Âmbito detalhado do projecto
- Cronograma visual com fases e marcos
- Referências para credibilidade
- Condições de pagamento e validade

