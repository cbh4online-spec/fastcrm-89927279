

## Estratégia de Preços — Módulo Recursos Humanos

### Diagnóstico

O módulo `hr-management` está registado no marketplace com `pricing_model = 'free'` e `price_eur = 0.00`. Isto significa que qualquer workspace pode instalá-lo sem custo, o que contradiz o objectivo de o monetizar como add-on premium.

### Módulos pagos existentes (referência)

| Módulo | Preço/mês |
|--------|-----------|
| Purchase & Procurement | €49 |
| Student Journey | €49 |
| Portal B2B | €89 |

### Recomendação de preço para RH

O módulo de RH inclui funcionalidades substanciais:
- Gestão de funcionários (fichas, documentos)
- Controlo de ponto (clock-in/out com geolocalização e QR)
- Gestão de turnos e escalas
- Férias e ausências
- Dashboard com KPIs de RH
- Terminal Kiosk QR

**Preço sugerido: €49/mês** — alinhado com Procurement e Student Journey, que têm complexidade comparável. O Portal B2B está a €89 porque inclui lógica de e-commerce B2B mais complexa.

### Plano de implementação

**1. Migração SQL** — Actualizar o registo na tabela `marketplace_modules`:
```sql
UPDATE marketplace_modules
SET pricing_model = 'monthly',
    price_eur = 49.00,
    tagline = 'Gestão completa de RH: funcionários, ponto, turnos e ausências'
WHERE slug = 'hr-management';
```

**2. Remover activação automática** — Eliminar os registos de `workspace_modules` que foram inseridos automaticamente para todos os workspaces (da migração anterior), para que o módulo passe a exigir instalação via marketplace:
```sql
DELETE FROM workspace_modules
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'hr-management');
```

**3. Verificar integração com extension-check** — A Edge Function `extension-check` já valida elegibilidade com base em `pricing_model` e `price_eur`. Com `monthly` + `49.00`, o fluxo de checkout via Stripe será activado automaticamente pelo `module-checkout`.

**4. Sem alterações de código frontend** — O `ModuleGuard` já protege todas as páginas de RH. Ao remover o módulo dos workspaces, o guard mostrará o ecrã de instalação/compra.

### Critérios de aceitação

1. Módulo RH aparece no marketplace com preço €49/mês
2. Workspaces sem instalação vêem prompt de compra ao aceder a `/dashboard/hr/*`
3. Fluxo de checkout Stripe funciona para o módulo
4. Após pagamento, módulo fica activo e acessível

### Riscos

- **Workspaces existentes**: Ao remover activações automáticas, workspaces que já usam o módulo perderão acesso. Pode ser necessário manter os registos existentes (grandfather) e só cobrar novos.
- **Alternativa**: Manter activações existentes e apenas mudar `pricing_model` para que novas instalações sejam pagas.

