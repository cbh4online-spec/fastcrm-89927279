
# Plano: Corrigir Processamento de Documentos Grandes

## Problema Identificado

As Edge Functions do Lovable Cloud têm um limite de memória de **150MB**. Um PDF de 57.88MB, ao ser carregado em memória mais o overhead de processamento, excede este limite.

## Solução Proposta

### Opção A: Limite Realista + Streaming Parcial (Recomendada)

Implementar uma estratégia de **streaming parcial** que:
1. Limita o download a **20MB** do ficheiro (primeiras páginas)
2. Processa apenas essa porção
3. Informa o utilizador que apenas parte foi processada

### Opção B: Processamento via Trigger.dev

Para ficheiros >20MB, delegar o processamento para um **Trigger.dev job** que:
- Não tem os mesmos limites de memória
- Pode processar ficheiros maiores de forma assíncrona
- Actualiza o status quando terminar

---

## Alterações (Opção A)

### 1. Edge Function - Download Parcial

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/knowledge-document-process/index.ts` | Implementar range request para baixar apenas os primeiros 20MB |

**Lógica:**
```text
SE fileSize > 20MB:
  → Baixar apenas primeiros 20MB usando Range header
  → Extrair texto disponível
  → Processar normalmente
  → Guardar nota: "Processado parcialmente (20MB de 57.88MB)"
```

### 2. Corrigir Status Pendente

Actualizar o documento actual para status `failed` com mensagem clara:
```sql
UPDATE knowledge_sources 
SET processing_status = 'failed',
    processing_error = 'Ficheiro demasiado grande (57.88MB). Limite actual: 20MB para processamento estável.'
WHERE id = '16b7a9c8-39a4-45e7-9109-7a7ea4359855';
```

### 3. UI - Feedback Claro

Mostrar mensagem clara quando ficheiro é muito grande:
- Antes do upload: Aviso se >20MB
- Durante processamento: Indicador de progresso real
- Após falha: Mensagem explicativa com opções

---

## Limites Finais Recomendados

| Limite | Valor | Razão |
|--------|-------|-------|
| Upload máximo | 100MB | Storage suporta |
| Processamento completo | 20MB | Limite de memória Edge Function |
| Processamento parcial | 20MB dos primeiros bytes | Para ficheiros >20MB |

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/knowledge-document-process/index.ts` | Range request + limites claros |
| `src/components/knowledge-base/AddSourcePanel.tsx` | Aviso para ficheiros >20MB |
| `src/components/knowledge-base/KnowledgeSourcesPanel.tsx` | Melhor feedback de erros |

---

## Alternativa Futura

Para suportar ficheiros maiores que 20MB de forma completa, seria necessário:
1. Usar **Trigger.dev** para processamento heavy
2. Ou um serviço externo de parsing de PDFs (ex: Google Document AI, AWS Textract)
3. Ou guardar o PDF e processar páginas individualmente em múltiplas chamadas
