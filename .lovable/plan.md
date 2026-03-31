

## Diagnóstico

O problema principal é que a **Edge Function `hr-clock-action` não estava deployed**. Confirmei que:

1. **Código do `ClockInOutButton.tsx`** — correcto, usa `useClockAction` → `supabase.functions.invoke("hr-clock-action")`
2. **Hook `useCurrentEmployee`** — correcto, busca `hr_employees` por `user_id`
3. **Hook `useClockAction`** — correcto, envia `employee_id`, `entry_type`, `workspace_id`
4. **Edge Function `hr-clock-action`** — código correcto, mas **não estava deployed**
5. **Schema** — tabelas `hr_work_sessions` e `hr_time_entries` existem com colunas correctas
6. **RLS** — policies `workspace_isolation` em ambas as tabelas
7. **Dados** — registos de `hr_employees` com `user_id` existem

**Causa raiz:** A edge function `hr-clock-action` não estava deployed no ambiente. Já a **deployei agora** durante o diagnóstico.

## Acção

A edge function já foi re-deployed com sucesso. Não são necessárias alterações de código — o botão "Iniciar Trabalho" deverá funcionar imediatamente e os registos aparecerão no Controlo de Ponto.

Se o problema persistir após teste, as causas possíveis são:
- O utilizador autenticado não ter registo em `hr_employees` (aparecerá o aviso amarelo)
- Erro de rede na invocação da edge function (aparecerá toast de erro)

**Recomendação:** Testar agora clicando em "Iniciar Trabalho" no dashboard e verificar se o registo aparece em People Operations → Controlo de Ponto.

