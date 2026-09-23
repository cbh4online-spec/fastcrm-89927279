#!/usr/bin/env bash
# Testa a migração pendente da Fase 1 contra um Postgres LOCAL e descartável.
# Não usa nem toca na base de produção.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
PORT=55439
trap 'pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
initdb -D "$TMP/data" -U postgres -A trust >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL="psql -h $TMP -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f "$DIR/stub_schema.sql"
$PSQL -f "$DIR/../20260923180000_sdr_prospecting_phase1.sql"
$PSQL -f "$DIR/../20260923180000_sdr_prospecting_phase1.sql"   # idempotência da reaplicação
$PSQL -f "$DIR/assertions.sql"

# Concorrência real: 10 sessões a reservar quota (máx 3/dia, intervalo 0) em paralelo.
for i in $(seq 1 10); do
  $PSQL -At -c "select allowed from public.sdr_reserve_send_slot('00000000-0000-0000-0000-00000000000a','whatsapp','wa:x',(select id from public.sdr_step_attempts where step_order=100+$i),3,0)" >> "$TMP/out" &
done
wait
ALLOWED=$(grep -c '^t$' "$TMP/out" || true)
echo "reservas concorrentes aceites: $ALLOWED (esperado 3)"
[ "$ALLOWED" = "3" ]

# Concorrência real no claim: 8 sessões sobre a mesma etapa → 1 claim.
: > "$TMP/claim"
for i in $(seq 1 8); do
  $PSQL -At -c "select claimed from public.sdr_claim_step_attempt('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1',null,7,'email')" >> "$TMP/claim" &
done
wait
CLAIMS=$(grep -c '^t$' "$TMP/claim" || true)
echo "claims concorrentes aceites: $CLAIMS (esperado 1)"
[ "$CLAIMS" = "1" ]
echo "OK: todos os testes SQL locais passaram"
