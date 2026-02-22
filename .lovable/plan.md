

# Correcao definitiva: Mover dialog para fora do TabsContent

## Causa raiz

O `BulkOutreachDialog` vive dentro de `ProspectingResults`, que vive dentro de `TabsContent value="results"`. O Radix `TabsContent` desmonta o conteudo quando o tab nao esta activo. Se algo causar remontagem do componente `ProfessionalProspecting` (token refresh, auth re-render, etc.), o `activeTab` volta ao valor por defeito `"search"`, o que desmonta o `ProspectingResults` e destroi todo o estado do dialog, incluindo `bulkOutreachOpen`.

A solucao e mover o estado e renderizacao do dialog para FORA do `TabsContent`, ao nivel da pagina `ProfessionalProspecting.tsx`.

## Alteracoes

### Ficheiro 1: `ProfessionalProspecting.tsx`

1. Importar o `BulkOutreachDialog` directamente
2. Levantar (lift) o estado do dialog para este nivel:
   - `bulkOutreachOpen`
   - `bulkOutreachMessages`
   - `bulkOutreachProfiles`
   - `bulkGenerating`
   - `bulkGenerationProgress`
3. Renderizar o `BulkOutreachDialog` FORA de qualquer `TabsContent` (ao lado do dialog de oferta, fora dos tabs)
4. Passar callbacks para `ProspectingResults` para que possa abrir o dialog e enviar dados

### Ficheiro 2: `ProspectingResults.tsx`

1. Remover o estado local do dialog (`bulkOutreachOpen`, `bulkOutreachMessages`, etc.)
2. Remover a renderizacao do `BulkOutreachDialog`
3. Em vez disso, receber uma prop `onStartBulkOutreach` que e chamada com os perfis seleccionados
4. A logica de geracao de mensagens pode ficar em `ProspectingResults` mas enviar resultados para cima via callback, OU ser movida para o pai

### Ficheiro 3: `BulkOutreachDialog.tsx`

Sem alteracoes significativas — o componente ja usa `position: fixed` e nao tem dependencia do Radix Dialog.

## Fluxo resultante

```text
ProfessionalProspecting (pagina)
  |-- Tabs
  |     |-- TabsContent "search" -> ProspectingSearch
  |     |-- TabsContent "results" -> ProspectingResults (sem dialog)
  |     |-- TabsContent "history" -> ProspectingHistory
  |
  |-- BulkOutreachDialog (FORA dos tabs, posicao fixa, sempre montado quando open=true)
```

Desta forma, mesmo que os tabs mudem ou o `ProspectingResults` desmonte, o dialog permanece visivel e funcional.

## Detalhes tecnicos

**ProfessionalProspecting.tsx** — novo estado e renderizacao:

```typescript
// Estado levantado do dialog
const [bulkOutreachOpen, setBulkOutreachOpen] = useState(false);
const [bulkOutreachMessages, setBulkOutreachMessages] = useState([]);
const [bulkOutreachProfiles, setBulkOutreachProfiles] = useState([]);
const [bulkGenerating, setBulkGenerating] = useState(false);
const [bulkGenerationProgress, setBulkGenerationProgress] = useState({ done: 0, total: 0 });

// Callback para ProspectingResults iniciar outreach
const handleStartBulkOutreach = (profiles, generateFn) => {
  setBulkOutreachProfiles(profiles);
  setBulkOutreachMessages([]);
  setBulkOutreachOpen(true);
  setBulkGenerating(true);
  // ... iniciar geracao
};

// Renderizacao fora dos Tabs:
<BulkOutreachDialog
  open={bulkOutreachOpen}
  onOpenChange={setBulkOutreachOpen}
  profiles={bulkOutreachProfiles}
  generatedMessages={bulkOutreachMessages}
  isGenerating={bulkGenerating}
  generationProgress={bulkGenerationProgress}
  userId={user?.id}
  workspaceId={currentWorkspace?.id}
  onComplete={() => {
    queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  }}
/>
```

**ProspectingResults.tsx** — nova prop:

```typescript
interface ProspectingResultsProps {
  searchId: string | null;
  onGoToSearch?: () => void;
  defaultTone?: "formal" | "casual" | "direto";
  onStartBulkOutreach?: (
    profiles: BulkProfile[],
    onMessageGenerated: (msg: GeneratedMessage) => void,
    onGenerationComplete: () => void,
    setProgress: (p: { done: number; total: number }) => void
  ) => void;
}
```

Quando o utilizador clica "Outreach em Massa", chama `onStartBulkOutreach` que comunica com o pai.

## Resumo

| Ficheiro | Alteracao |
|---|---|
| `ProfessionalProspecting.tsx` | Levantar estado do dialog; renderizar `BulkOutreachDialog` fora dos tabs |
| `ProspectingResults.tsx` | Remover estado e renderizacao do dialog; usar callback `onStartBulkOutreach` |
| `BulkOutreachDialog.tsx` | Sem alteracoes |
