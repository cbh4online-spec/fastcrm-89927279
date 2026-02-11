
# Corrigir Modulos que Dizem "Instalado" Mas Nao Mostram Badge

## Problema

Quando um modulo e desinstalado, o seu registo na base de dados muda o status para "canceled" mas a linha continua a existir. Quando o utilizador tenta reinstalar esse modulo, o codigo encontra a linha existente (com status "canceled") e mostra a mensagem "Este modulo ja esta instalado" sem realmente reativar o modulo. O resultado: o utilizador pensa que instalou, mas o modulo fica com status "canceled" e nao aparece como instalado em lado nenhum.

## Solucao

Alterar a logica de instalacao no `useWorkspaceModules.ts` para tratar o caso de reinstalacao:

1. Em vez de apenas verificar se existe um registo, verificar tambem o **status** desse registo
2. Se existir um registo com status "canceled" ou "expired", fazer **update** para "active" em vez de inserir novo
3. Se existir com status "active" ou "trial", ai sim mostrar "ja instalado"

## Seccao Tecnica

### Ficheiro: `src/hooks/useWorkspaceModules.ts`

Na `installMutation.mutationFn`, alterar o bloco que verifica registos existentes (linhas 79-88):

**Antes:**
```typescript
const { data: existing } = await supabase
  .from("workspace_modules")
  .select("id")
  .eq("workspace_id", workspaceId)
  .eq("module_id", module.id)
  .maybeSingle();
if (existing) {
  toast.info("Este modulo ja esta instalado");
  return false;
}
```

**Depois:**
```typescript
const { data: existing } = await supabase
  .from("workspace_modules")
  .select("id, status")
  .eq("workspace_id", workspaceId)
  .eq("module_id", module.id)
  .maybeSingle();

if (existing) {
  if (existing.status === "active" || existing.status === "trial") {
    toast.info("Este modulo ja esta instalado");
    return false;
  }
  // Reactivate canceled/expired module
  const { error } = await supabase
    .from("workspace_modules")
    .update({
      status: "active",
      cancel_at_period_end: false,
      current_period_start: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw error;
  return true;
}
```

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useWorkspaceModules.ts` | Tratar reinstalacao de modulos cancelados fazendo update em vez de ignorar |
