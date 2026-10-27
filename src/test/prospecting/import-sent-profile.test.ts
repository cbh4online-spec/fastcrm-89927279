import { it, expect, vi } from 'vitest';
import { importSentProfile } from '@/lib/prospecting/importSentProfile';

it('imports a confirmed profile via the safe RPC with a supported Instagram source', async () => {
  const rpc = vi.fn(async () => ({ data: { status: 'created', lead_id: 'lead-1', matches: [] }, error: null }));
  const result = await importSentProfile({ rpc } as never, 'ws-1', {
    id: 'profile-1', profile_name: 'Ana', platform: 'instagram', profile_url: 'https://www.instagram.com/ana/',
  }, true);
  expect(result.lead_id).toBe('lead-1');
  expect(rpc).toHaveBeenCalledWith('prospecting_import_lead_safe', expect.objectContaining({
    p_workspace_id: 'ws-1', p_profile_id: 'profile-1', p_allow_possible: true,
    p_lead: expect.objectContaining({ source: 'instagram_extractor', name: 'Ana' }),
  }));
});

it('reports an existing company without creating a duplicate lead', async () => {
  const rpc = vi.fn(async () => ({ data: { status: 'exists', matches: [] }, error: null }));
  const result = await importSentProfile({ rpc } as never, 'ws-1', {
    id: 'profile-1', profile_name: 'Ana', platform: 'instagram', profile_url: 'https://www.instagram.com/ana/',
  });
  expect(result.status).toBe('exists');
  expect(result.lead_id).toBeUndefined();
  expect(rpc).toHaveBeenCalledTimes(1);
});