

# Geofencing: Alertas Automáticos de Pica Ponto Fora de Zona

## Diagnóstico

O sistema actual captura coordenadas GPS (lat/lng) em cada clock-in, mas **não existe qualquer definição de zonas permitidas nem validação geográfica**. Não há tabela de localizações autorizadas, nem lógica de verificação de distância.

## Solução

Criar um sistema de geofencing com 3 componentes:

1. **Tabela de zonas autorizadas** — locais permitidos por workspace, com coordenadas centro + raio
2. **Validação na edge function** — ao fazer clock-in, calcular distância e gerar anomalia se fora de zona
3. **UI de gestão** — CRUD de zonas nas definições de RH

## Alterações

| Componente | Acção |
|---|---|
| **Migração SQL** | Criar tabela `hr_geofence_zones` (workspace_id, name, lat, lng, radius_meters, is_active) com RLS |
| **Edge function `hr-clock-action`** | Após clock-in, buscar zonas activas do workspace → calcular distância Haversine → se fora de todas as zonas, inserir anomalia em `hr_attendance_anomalies` com tipo `outside_geofence` |
| **Migração SQL** | Adicionar `outside_geofence` como valor possível no campo `anomaly_type` (actualmente é text, verificar constraint) |
| **Hook `useHRGeofenceZones`** | CRUD de zonas — listar, criar, editar, eliminar |
| **UI: GeofenceZonesTab** | Componente nas definições de RH para gerir zonas (nome, endereço, coordenadas, raio) com mapa visual opcional |
| **Hook anomalias** | Actualizar tipo `AttendanceAnomaly` para incluir `outside_geofence` |

## Detalhe técnico

### Tabela `hr_geofence_zones`

```sql
CREATE TABLE public.hr_geofence_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 200,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

RLS: SELECT/INSERT/UPDATE/DELETE escopado por `workspace_members`.

### Lógica Haversine na edge function

```text
clock_in com lat/lng
  → buscar zonas activas do workspace
  → para cada zona, calcular distância (Haversine)
  → se nenhuma zona está dentro do raio permitido:
      → inserir anomalia "outside_geofence" severity "warning"
      → devolver alerta no response (geofence_alert)
  → se dentro de zona:
      → continuar normalmente
```

A fórmula de Haversine calcula distância entre dois pontos geográficos com precisão suficiente para raios de 50m–5km.

### UI nas Definições de RH

Nova tab "Geofencing" na página de definições HR, com:
- Lista de zonas com nome, endereço, raio
- Botão adicionar zona (formulário com nome, endereço, coordenadas, raio em metros)
- Toggle activo/inactivo
- Eliminar zona

### Fluxo do alerta

Quando um colaborador pica ponto fora de zona:
1. O clock-in é **aceite** (não bloqueado) — regista normalmente
2. Uma anomalia `outside_geofence` é criada automaticamente
3. O frontend recebe `geofence_alert` na resposta e mostra toast de aviso
4. A anomalia aparece no painel de anomalias existente para resolução pelo gestor

