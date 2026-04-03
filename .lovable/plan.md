

# Adicionar Localização às Sessões de Ponto

## Diagnóstico

A tabela `hr_time_entries` já tem `location_lat` e `location_lng`, mas a `hr_work_sessions` não guarda localização. O `ClockInOutButton` também não captura coordenadas do browser antes de enviar o clock action. Resultado: mesmo que a edge function receba lat/lng, não há dados a enviar nem onde os guardar na sessão.

## Solução

### 1. Migração DB — Adicionar colunas de localização à `hr_work_sessions`

- `clock_in_lat` (numeric, nullable)
- `clock_in_lng` (numeric, nullable)  
- `clock_in_location_name` (text, nullable) — nome da cidade/local para exibição rápida

### 2. Edge Function — Guardar localização no clock_in

No bloco `clock_in` da `hr-clock-action`, passar `location_lat`, `location_lng` e opcionalmente `location_name` para o insert da sessão.

### 3. ClockInOutButton — Capturar geolocalização do browser

Usar `navigator.geolocation.getCurrentPosition()` antes de cada clock action para enviar coordenadas. Usar reverse geocoding simples (já existe `useWeatherLocation` que obtém cidade) para incluir o nome do local.

### 4. UI — Mostrar localização na tabela de sessões e no resumo do dia

Adicionar coluna "Local" na tabela de sessões com ícone `MapPin` + nome da cidade. No resumo do dia do `ClockInOutButton`, mostrar o local ao lado do horário.

## Alterações

| Ficheiro/Recurso | Acção |
|---|---|
| **Migração SQL** | ADD `clock_in_lat`, `clock_in_lng`, `clock_in_location_name` a `hr_work_sessions` |
| `supabase/functions/hr-clock-action/index.ts` | Guardar lat/lng/location_name no insert do clock_in |
| `src/components/hr/ClockInOutButton.tsx` | Capturar geolocalização antes de enviar clock actions; passar lat/lng/location_name ao mutation |
| `src/hooks/hr/useHRTimeEntries.ts` | Adicionar campos de localização ao tipo `HRWorkSession` |
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | Coluna "Local" na tabela de sessões com `MapPin` + cidade |

### Detalhe técnico

**Captura de geolocalização (ClockInOutButton):**
- Função async `getLocation()` que retorna `{ lat, lng }` via `navigator.geolocation`
- Timeout de 5s — se falhar, envia sem localização (não bloqueia o registo)
- Usar a cidade já obtida pelo `useWeatherLocation` como `location_name`

**Edge Function:**
- No clock_in, incluir `clock_in_lat`, `clock_in_lng`, `clock_in_location_name` no insert
- Campos opcionais — null se não enviados

