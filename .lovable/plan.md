
# Plano: Suportar Documentos Superiores a 60MB na Base de Conhecimento

## Problema Actual

| Componente | Limite Actual | Localização |
|------------|--------------|-------------|
| Bucket Storage | 10 MB | `storage.buckets.file_size_limit` |
| Frontend UI | 10 MB | `AddSourcePanel.tsx` linha 34 |
| Processamento AI | 50.000 chars | `knowledge-document-process/index.ts` linha 122 |

## Solução Proposta

### Parte 1: Aumentar Limite do Bucket

Alterar o limite do bucket `knowledge-documents` para 100MB (suficiente para documentos grandes).

```sql
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB
WHERE name = 'knowledge-documents';
```

### Parte 2: Actualizar Frontend

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/knowledge-base/AddSourcePanel.tsx` | Aumentar `MAX_FILE_SIZE` para 100MB |

### Parte 3: Processamento Inteligente para Ficheiros Grandes

Para ficheiros grandes, o processamento actual tem limitacoes:

1. **PDFs grandes**: A API de visao tem limites de tamanho de imagem/payload
2. **Memoria**: Carregar ficheiros de 60MB+ em memoria pode causar timeouts na edge function

**Estrategia de Chunking:**

```text
Ficheiro > 20MB?
  ├─ SIM → Dividir em chunks de 15MB
  │        Processar cada chunk separadamente
  │        Combinar resultados
  │
  └─ NÃO → Processar normalmente
```

### Parte 4: Melhorias na Edge Function

| Alteracao | Descricao |
|-----------|-----------|
| Aumentar limite de texto | De 50.000 para 100.000 caracteres |
| Chunked processing | Para PDFs grandes, processar por paginas |
| Progress tracking | Actualizar status durante processamento longo |
| Timeout handling | Retry automatico para operacoes longas |

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/knowledge-base/AddSourcePanel.tsx` | Limite 100MB + UI feedback para ficheiros grandes |
| `supabase/functions/knowledge-document-process/index.ts` | Processamento chunked + limites maiores |
| `src/hooks/useKnowledgeBase.ts` | Progress callback para uploads grandes |

---

## Detalhes Tecnicos

### Frontend: Upload com Progresso

Para ficheiros grandes, mostrar barra de progresso durante upload.

### Edge Function: Processamento por Chunks

Para PDFs grandes:
1. Extrair texto por paginas (nao tudo de uma vez)
2. Processar em batches de 20 paginas
3. Combinar FAQs e topicos de todos os chunks
4. Actualizar status a cada batch processado

### Limites Finais

| Componente | Novo Limite |
|------------|-------------|
| Upload maximo | 100 MB |
| Texto processado por batch | 30.000 chars |
| Paginas por batch (PDF) | 20 |
| Timeout total | 5 minutos |

---

## Notas de Implementacao

1. O Supabase Storage suporta ficheiros ate 5GB (paid tier), portanto 100MB e seguro
2. Edge functions tem timeout de 150s no plano free - o chunking evita este limite
3. Ficheiros Word (DOCX) geralmente sao menores, mas o mesmo chunking aplica-se se necessario
