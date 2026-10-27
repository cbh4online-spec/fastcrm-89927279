import { it, expect } from 'vitest';
import { roleHasCapability } from '@/lib/permissions/capabilities';

it('only workspace administration roles can open EventMap', () => {
  for (const role of ['owner','admin','agency'] as const) expect(roleHasCapability(role,'workspace.manage')).toBe(true);
  for (const role of ['agent','viewer','hr'] as const) expect(roleHasCapability(role,'workspace.manage')).toBe(false);
});