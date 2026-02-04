
# Plano: Resolver Documentos Presos em "A Processar"

## Problema

O documento "TRICOLOGIA.pdf" está preso em estado "processing" há 3 dias (desde 1 de Fevereiro). Isto acontece porque:

1. O processamento falhou silenciosamente (timeout ou limite de memória da Edge Function)
2. O status nunca foi actualizado para "failed"
3. A interface não permite reprocessar documentos em estado "processing"

## Solução

Implementar três correções:

### 1. Permitir Reprocessar/Cancelar Documentos em "processing"

Actualmente, o menu de acções só aparece para status `failed`, `pending` ou `completed`. Precisamos adicionar a opção de "Cancelar" ou "Forçar Reprocessamento" para documentos em `processing`.

**Ficheiro: `src/components/knowledge-base/KnowledgeSourcesPanel.tsx`**

Alterar a condição da linha 183:
```typescript
// Antes (não inclui 'processing')
{(source.processingStatus === 'failed' || source.processingStatus === 'pending' || source.processingStatus === 'completed') && onReprocess && (

// Depois (inclui 'processing')
{onReprocess && (
```

Adicionar opção específica para cancelar processamento preso:
```typescript
{source.processingStatus === 'processing' && onReprocess && (
  <DropdownMenuItem onClick={() => onReprocess(source.id)}>
    <XCircle className="h-4 w-4 mr-2" />
    Cancelar e Reprocessar
  </DropdownMenuItem>
)}
```

### 2. Detectar Documentos Presos (Stale) e Marcá-los

Adicionar lógica para detectar documentos em "processing" há mais de 30 minutos e mostrá-los visualmente como "presos".

**Ficheiro: `src/components/knowledge-base/KnowledgeSourcesPanel.tsx`**

```typescript
// Verificar se o processamento está preso (mais de 30 minutos)
const isStale = source.processingStatus === 'processing' && 
  new Date().getTime() - new Date(source.updatedAt).getTime() > 30 * 60 * 1000;

{isStale && (
  <Badge variant="outline" className="bg-amber-50 text-amber-600 text-xs">
    <AlertTriangle className="h-3 w-3 mr-1" />
    Possível bloqueio
  </Badge>
)}
```

### 3. Forçar Reset do Status ao Reprocessar

**Ficheiro: `src/components/knowledge-base/KnowledgeBaseModule.tsx`**

Na função `onReprocess`, garantir que o status é resetado para "pending" antes de chamar a edge function:

```typescript
onReprocess={async (sourceId) => {
  const source = sources.find(s => s.id === sourceId);
  if (source) {
    toast.info('A reprocessar fonte...');
    
    // Primeiro resetar para pending (em vez de processing)
    await supabase
      .from('knowledge_sources')
      .update({ 
        processing_status: 'pending', // Mudou de 'processing'
        processing_error: null,
        last_processed_at: null 
      })
      .eq('id', sourceId);
    
    // Depois actualizar para processing e chamar a função
    await supabase
      .from('knowledge_sources')
      .update({ processing_status: 'processing' })
      .eq('id', sourceId);
    
    // ... resto do código
  }
}}
```

### 4. Corrigir Edge Function para Marcar Erros Correctamente

**Ficheiro: `supabase/functions/knowledge-document-process/index.ts`**

Adicionar timeout handler e garantir que erros de timeout são capturados:

```typescript
// No início do processamento background
const timeout = setTimeout(async () => {
  await supabase
    .from('knowledge_sources')
    .update({
      processing_status: 'failed',
      processing_error: 'Processamento excedeu o tempo limite (timeout)'
    })
    .eq('id', sourceId);
}, 140000); // 140 segundos (antes do limite de 150s)

// No final do processamento
clearTimeout(timeout);
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/knowledge-base/KnowledgeSourcesPanel.tsx` | Adicionar opção para reprocessar/cancelar documentos em "processing" + indicador de documento preso |
| `src/components/knowledge-base/KnowledgeBaseModule.tsx` | Melhorar lógica de reprocessamento |
| `supabase/functions/knowledge-document-process/index.ts` | Adicionar timeout handler |
| `supabase/functions/knowledge-document-trigger/index.ts` | Adicionar timeout handler |

## Correcção Imediata (via Base de Dados)

Para resolver o documento actual que está preso, será necessário resetar manualmente o status:

```sql
UPDATE knowledge_sources 
SET processing_status = 'failed', 
    processing_error = 'Processamento falhou (timeout). Clique para reprocessar.'
WHERE id = '1e0f51a8-ff06-4423-8895-bf5670429e01';
```

## Resultado Esperado

1. O documento "Documento" aparecerá com status "Erro" em vez de "A processar"
2. O utilizador poderá clicar em "Processar Agora" para tentar novamente
3. Futuros documentos presos serão detectados automaticamente após 30 minutos
4. A edge function marcará correctamente o status como "failed" se ocorrer timeout
