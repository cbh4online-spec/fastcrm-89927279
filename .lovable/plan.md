
1. Diagnóstico
- O problema principal não é o “build error”; o log de build mostra output normal/truncado.
- O bug real é de estado do relógio: existe uma sessão activa no backend, mas o frontend deixa de a ver e volta a mostrar o fluxo de “clock-in”.
- Há um indício muito forte de desfasamento por timezone:
  - no frontend, o botão consulta sessões por `format(new Date(), "yyyy-MM-dd")` (dia local);
  - na edge function `hr-clock-action`, o `session_date` é calculado com `now.toISOString().split("T")[0]` (UTC).
  - No replay, o utilizador estava às 00:55; nessa hora Lisboa e UTC podem cair em dias diferentes.
- Resultado: o backend detecta “Já existe uma sessão aberta”, mas o frontend não encontra essa sessão no dia filtrado, por isso desaparecem os botões correctos de pausa/terminar.
- Há ainda um segundo problema de resiliência: quando a função devolve `fallback: true`, o hook mostra toast mas não força refetch das sessões, por isso a UI não se auto-corrige.

2. Decisões de produto/UX
- O controlo principal do relógio não deve depender apenas das sessões “de hoje”.
- Se existir sessão activa, o utilizador deve ver sempre “Pausa / Terminar” ou “Retomar”, mesmo que a sessão tenha começado antes da meia-noite.
- Quando o backend disser que já existe uma sessão aberta, a UI deve sincronizar imediatamente o estado e recuperar os botões certos.

3. Estrutura técnica
Frontend
- Criar um caminho separado para obter a sessão activa: procurar a sessão mais recente com `clock_in_at != null` e `clock_out_at == null`, sem filtrar por data.
- Manter a query por dia apenas para resumo “Hoje” e totais.
- Em `ClockInOutButton`, usar:
  - `activeSession` da nova query dedicada;
  - `completedSessions` da query diária.
- Em `useClockAction`, quando houver `fallback`/erro de negócio:
  - mostrar aviso;
  - invalidar/refetch `hr-work-sessions` para ressincronizar a UI.

Backend
- Corrigir `session_date` para usar dia de negócio em `Europe/Lisbon` (ou helper preparado para futura timezone do workspace), em vez de UTC.
- Aplicar a mesma lógica em:
  - `hr-clock-action`
  - `hr-clock-qr`
  - `hr-face-verify`
  - `hr-attendance-anomalies`
- Onde hoje há `maybeSingle()` em cenários frágeis, trocar por `order(...).limit(1)` ou leitura explícita da sessão aberta, para evitar problemas com múltiplas sessões diárias.

Segurança/hardening
- Validar manualmente JWT e pertença ao workspace dentro de `hr-clock-action`, porque a função usa service role e actualmente confia em `employee_id/workspace_id` vindos do cliente.
- Confirmar que o colaborador pertence ao workspace e que o utilizador tem permissão para actuar sobre esse registo.

4. Plano de implementação
- Passo 1: introduzir helper de “business date” consistente para Portugal.
- Passo 2: adicionar hook/query para sessão activa sem filtro por data.
- Passo 3: refactor do `ClockInOutButton` para usar sessão activa global + resumo diário separado.
- Passo 4: actualizar `useClockAction` para refetch em respostas `fallback`.
- Passo 5: alinhar `hr-clock-action`, `hr-clock-qr`, `hr-face-verify` e `hr-attendance-anomalies` com a mesma lógica de data e selecção de sessão.
- Passo 6: hardening da edge function com validação de autenticação/autorização.
- Passo 7: validar se existem registos já afectados por `session_date` errado; se houver, avaliar correcção controlada dos dados.

5. Critérios de aceitação
- Se uma sessão ficar aberta antes da meia-noite, às 00:xx o utilizador continua a ver “Pausa/Terminar” ou “Retomar”.
- Ao tentar novo clock-in com sessão já aberta, aparece aviso e a UI corrige-se sozinha sem refresh manual.
- O botão nunca desaparece deixando o utilizador sem forma de parar o relógio.
- QR, face e app seguem a mesma regra de dia de negócio.
- Não há blank screen nem erro runtime neste fluxo.
- A edge function rejeita pedidos sem autenticação válida ou fora do workspace.

6. Riscos e pontos por validar
- Pode haver dados históricos com `session_date` desalinhado; isso pode afectar dashboards e anomalias.
- O hook actual do colaborador parece suficiente, mas convém validar loading/empty state para não esconder botões cedo demais.
- Convém testar especificamente:
  - fim do dia / após meia-noite;
  - sessão activa em pausa;
  - múltiplas sessões no mesmo dia;
  - mobile;
  - fluxo completo ponta a ponta após a correcção.
