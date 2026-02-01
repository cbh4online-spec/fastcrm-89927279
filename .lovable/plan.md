
# Plano: Corrigir Contagem de Cursos Completados

## Problema Identificado

Os enrollments na base de dados têm:
- `progress_percent = 100` (100% progresso)
- `status = 'enrolled'` (não foi atualizado para `completed`)

O hook `useJourneyTransitions.ts` conta apenas enrollments com `status === 'completed'`, ignorando os que têm progresso a 100%.

**Dados actuais:**

| Aluno | Enrollments | Progresso | Status DB | Contagem Mostrada |
|-------|-------------|-----------|-----------|-------------------|
| Sandra | 2 | 100%, 100% | enrolled, enrolled | 0 |
| Isménia | 3 | 0%, 0%, 0% | enrolled, enrolled, enrolled | 0 |

## Solução

### Abordagem: Usar progresso OU status para contar completados

Modificar o `useJourneyTransitions.ts` para considerar um enrollment como "completado" se:
- `status === 'completed'` **OU**
- `progress_percent >= 100`

Esta abordagem é mais robusta porque não depende de atualizações manuais de status.

### Alterações no Ficheiro

**Ficheiro:** `src/hooks/useJourneyTransitions.ts`

Linha 46 atual:
```typescript
const completedEnrollments = profileEnrollments.filter(e => e.status === 'completed');
```

Alterar para:
```typescript
const completedEnrollments = profileEnrollments.filter(e => 
  e.status === 'completed' || e.progress_percent >= 100
);
```

## Resultado Esperado

Após a correção:
- Sandra mostrará: **2 completado(s)**
- Isménia ainda mostrará: **0 completado(s)** (progresso 0%)

## Nota Adicional

Se a Isménia realmente completou 3 cursos, os dados de progresso na base de dados precisam de ser actualizados. Isso pode ser feito manualmente através do diálogo de edição de enrollment ou criando um novo enrollment com o progresso correto.
