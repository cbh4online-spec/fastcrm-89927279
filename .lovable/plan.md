
Objetivo: corrigir o “Negócios” duplicado no War Room sem perder a captura dos dois conceitos (negócios fechados vs negócios criados).

1) Diagnóstico já confirmado
- O bloco “O que falta esta semana” (`ExecutionRequirements`) está a renderizar 2 métricas:
  - `deals` (fechados)
  - `new_deals` (criados)
- Ambas aparecem com o mesmo rótulo “Negócios”, por isso parece repetição.
- Além disso, `new_deals` normalmente fica com meta 0 e hoje mostra texto confuso (“faltam (1/0)”).

2) Plano de implementação
- Ajustar nomenclatura para remover ambiguidade:
  - `deals` => “Negócios Fechados”
  - `new_deals` => “Negócios Criados”
- Corrigir renderização quando `target = 0`:
  - não mostrar “faltam (x/0)”
  - mostrar apenas valor atual da semana (ex.: “1 esta semana”) e sem barra de progresso de meta.
- Melhorar layout do grid para 5 métricas:
  - evitar o efeito visual de “linha quebrada com um item isolado” em ecrãs largos.
- Expor meta de `new_deals` em “Metas”:
  - incluir `new_deals` no `TargetsSettingsSheet` para poder configurar objetivo semanal e manter consistência com o que aparece no War Room.
- Internacionalização:
  - adicionar chaves novas para “Negócios Criados”, “esta semana”, e texto de “sem meta” em `pt/en/es/fr`.

3) Ficheiros a alterar
- `src/components/weekly-dashboard/ExecutionRequirements.tsx`
- `src/components/weekly-dashboard/TargetsSettingsSheet.tsx`
- `src/i18n/locales/pt/dashboard.json`
- `src/i18n/locales/en/dashboard.json`
- `src/i18n/locales/es/dashboard.json`
- `src/i18n/locales/fr/dashboard.json`

4) Resultado esperado
- Deixa de existir “Negócios” duplicado visualmente.
- Fica claro o que é “fechado” vs “criado”.
- Métricas sem meta deixam de mostrar texto inconsistente.
- Configuração de metas fica alinhada com todos os cartões mostrados no War Room.

5) Validação (após implementação)
- Criar 1 novo negócio e confirmar incremento em “Negócios Criados”.
- Fechar 1 negócio e confirmar incremento em “Negócios Fechados”.
- Verificar que não aparece mais “faltam (x/0)” para métricas sem meta.
- Confirmar layout correto em desktop largo e no breakpoint lg.
