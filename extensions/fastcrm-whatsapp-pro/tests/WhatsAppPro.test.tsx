import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WhatsAppPro from '../../../src/pages/WhatsAppPro';

vi.mock('@/hooks/useWhatsAppPro', () => ({
  useWhatsAppProviderInstance: () => ({ data: null, isLoading: false }),
  useEnsureWhatsAppProviderInstance: () => ({ mutate: vi.fn() }),
  useWhatsAppProEvents: () => ({ data: [] }),
  useWhatsAppProductShares: () => ({ data: [] }),
  useWhatsAppProTemplates: () => ({ data: [] }),
}));
vi.mock('@/hooks/useWhatsAppZapiConnection', () => ({ useWhatsAppZapiConnection: () => ({ data: null }) }));
vi.mock('@/components/layout/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/whatsapp-pro/WhatsAppProviderConfigCard', () => ({ WhatsAppProviderConfigCard: () => null }));
vi.mock('@/components/whatsapp-pro/WhatsAppWebhookLogsTable', () => ({ WhatsAppWebhookLogsTable: () => null }));
vi.mock('@/components/whatsapp-pro/WhatsAppSimulateInboundCard', () => ({ WhatsAppSimulateInboundCard: () => null }));
vi.mock('@/components/whatsapp-pro/WhatsAppPaymentMessageCard', () => ({ WhatsAppPaymentMessageCard: () => null }));
vi.mock('@/components/whatsapp-pro/WhatsAppAppointmentsSection', () => ({ WhatsAppAppointmentsSection: () => null }));
vi.mock('@/components/whatsapp-pro/WhatsAppFollowupsSection', () => ({ WhatsAppFollowupsSection: () => null }));
vi.mock('@/components/team-inbox/TeamPerformanceDashboard', () => ({ TeamPerformanceDashboard: () => null }));
vi.mock('@/components/team-inbox/TeamOpsSettingsCard', () => ({ TeamOpsSettingsCard: () => null }));

function mount() {
  return render(<MemoryRouter initialEntries={['/dashboard/whatsapp-pro']}><Routes>
    <Route path="/dashboard/whatsapp-pro" element={<WhatsAppPro />} />
    <Route path="/dashboard/whatsapp-pro/lookup" element={<div>Destino lookup</div>} />
  </Routes></MemoryRouter>);
}

describe('acesso ao piloto', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('o atalho navega para a pesquisa existente', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar contacto' }));
    expect(await screen.findByText('Destino lookup')).toBeInTheDocument();
  });
  it('falha de download termina loading sem gerar um link inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Descarregar v0.3.1' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Descarregar v0.3.1' })).toBeEnabled());
  });
});