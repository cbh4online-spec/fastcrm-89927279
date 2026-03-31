

## Registo Manual de Ponto com Justificação Obrigatória

### Diagnóstico

O card "Registar Ponto" (linhas 243-263 do `HRTimeTrackingPage`) tem botões de entrada/saída por funcionário que disparam `clockAction.mutate()` directamente sem pedir justificação. O hook `useClockAction` já suporta o campo `notes` no payload — só falta o UI para o recolher.

### Solução

**Ficheiro único**: `src/pages/dashboard/hr/HRTimeTrackingPage.tsx`

1. **Novo estado** para dialog de registo manual: `manualClockDialog` com `{ employee_id, employee_name, entry_type }` 
2. **Estado** `manualNotes` para a justificação (obrigatória, mínimo 5 caracteres)
3. **Dialog** com:
   - Indicação do colaborador e tipo de acção (Entrada/Saída)
   - `Textarea` para justificação obrigatória com validação
   - Botão "Confirmar" desactivado se justificação vazia/curta
4. **Substituir** os `onClick` directos dos botões de clock-in/clock-out para abrir o dialog em vez de submeter imediatamente
5. No submit do dialog, chamar `clockAction.mutate({ employee_id, entry_type, method: "manual", notes })` com as notas preenchidas

### Impacto
- Apenas alterações UI no `HRTimeTrackingPage.tsx`
- Zero alterações na edge function (já aceita `notes`)
- Zero alterações na base de dados
- Justificação fica guardada no campo `notes` de `hr_time_entries`

