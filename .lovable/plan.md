

## Diagnóstico: Ecrã em Branco

### Causa identificada

O erro reportado aponta para `supabase/functions/ai-usage-stats/index.ts` com `lineno: 0`, `colno: 0` e `stack: not_applicable`. Esta assinatura indica um **erro de deploy/build do sistema**, não um bug no código.

Verificações feitas:
- ✅ O código de `ai-usage-stats` está correcto e a função arranca normalmente (logs mostram "booted" consistentemente)
- ✅ `HRTimeTrackingPage.tsx` está sintaticamente correcto, imports válidos
- ✅ `FaceCaptureDialog.tsx` tem `export default` correcto
- ✅ `useHRAttendanceAnomalies.ts` sem erros
- ✅ A tabela `hr_attendance_anomalies` existe nos types gerados
- ✅ Migração SQL correcta
- ⚠️ `hr-face-verify` e `hr-attendance-anomalies` não têm logs — possível falha de deploy

### Plano de Resolução

**Passo 1**: Redesployer as duas novas edge functions (`hr-face-verify` e `hr-attendance-anomalies`) para garantir que estão disponíveis.

**Passo 2**: Verificar se o ecrã em branco persiste após o redeploy. Se persistir, investigar um possível erro de compilação Vite no frontend.

Não há alterações de código necessárias — o código está correcto. O problema é operacional (deploy).

