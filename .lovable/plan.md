

## Corrigir FK `head_id` em `hr_departments`

### Problema
O campo `head_id` da tabela `hr_departments` tem uma foreign key para `hr_employees(id)`, mas o sistema de funcionários usa `workspace_members` como fonte de IDs. Quando se selecciona um responsável no formulário de departamentos, o `emp.id` é um `workspace_members.id`, que não existe em `hr_employees` — causando a violação de FK.

### Solução
Alterar a FK de `head_id` para referenciar `workspace_members(id)` em vez de `hr_employees(id)`.

### Implementação

**1. Migration SQL** — Substituir a constraint:
```sql
ALTER TABLE hr_departments DROP CONSTRAINT hr_departments_head_id_fkey;
ALTER TABLE hr_departments ADD CONSTRAINT hr_departments_head_id_fkey 
  FOREIGN KEY (head_id) REFERENCES workspace_members(id) ON DELETE SET NULL;
```

Nenhuma alteração de código é necessária — o formulário já envia `workspace_members.id` correctamente.

### Critérios de aceitação
1. Criar/editar departamento com responsável seleccionado funciona sem erro
2. Criar departamento sem responsável continua a funcionar
3. FK protege integridade referencial contra `workspace_members`

