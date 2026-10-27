import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SalesRepSelector } from '@/components/entity/SalesRepSelector';

const eq = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@/contexts/WorkspaceContext', () => ({ useWorkspace: () => ({ currentWorkspace: { id: 'ws-1' } }) }));
vi.mock('@/contexts/WorkspaceInstanceContext', () => ({ useWorkspaceInstance: () => ({ workspaceClient: {
  from: () => ({
    update: () => ({ eq }),
    select: () => ({ eq: () => ({ order: async () => ({ data: [{ id: 'rep-1', name: 'Fernando', is_active: true }], error: null }) }) }),
  }),
} }) }));

it('assignment refreshes the companies list used by the company detail page', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['companies', 'ws-1', 'active'], [{ id: 'company-1', sales_rep_id: null }]);
  client.setQueryData(['company', 'company-1'], { id: 'company-1', sales_rep_id: null });
  render(<QueryClientProvider client={client}><SalesRepSelector entityType="company" entityId="company-1" currentSalesRepId={null} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Escolher vendedor' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Fernando' }));
  await waitFor(() => expect(client.getQueryState(['companies', 'ws-1', 'active'])?.isInvalidated).toBe(true));
  expect(client.getQueryState(['company', 'company-1'])?.isInvalidated).toBe(true);
  expect(eq).toHaveBeenCalledWith('id', 'company-1');
});