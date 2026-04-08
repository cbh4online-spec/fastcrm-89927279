import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all heavy dependencies
vi.mock('@/hooks/useEmailConnection', () => ({
  useActiveEmailConnection: () => ({
    data: { id: 'conn-1', email_address: 'test@example.com', display_name: 'Test' },
    isLoading: false,
  }),
  useSendEmail: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useEmailTranslation', () => ({
  useTranslateEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
  LANGUAGE_OPTIONS: [],
}));

vi.mock('@/hooks/useEmailSignature', () => ({
  useEmailSignature: () => ({ signatureHtml: '', isLoading: false }),
}));

vi.mock('@/hooks/useScheduledEmails', () => ({
  useScheduleEmail: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useCalendars', () => ({
  useCalendars: () => ({ calendars: [] }),
}));

vi.mock('@/hooks/useCalendarEvents', () => ({
  useCalendarEvents: () => ({ createEvent: vi.fn() }),
}));

vi.mock('@/hooks/useEntitySearch', () => ({
  useEntitySearch: () => ({
    searchContacts: vi.fn().mockResolvedValue([]),
    searchLeads: vi.fn().mockResolvedValue([]),
    isLoading: false,
  }),
}));

vi.mock('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ currentWorkspace: { id: 'ws-1' } }),
}));

vi.mock('@/contexts/WorkspaceInstanceContext', () => ({
  useWorkspaceInstance: () => ({ workspaceClient: null }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/contexts/EmailEditorContext', () => ({
  EmailEditorProvider: ({ children }: any) => children,
}));

vi.mock('@/components/email-builder/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/components/inbox/InboxTemplatePanel', () => ({
  InboxTemplatePanel: () => null,
}));

vi.mock('@/components/email/AIEmailAssistPanel', () => ({
  AIEmailAssistPanel: () => null,
}));

vi.mock('@/components/email/EmailAttachmentList', () => ({
  EmailAttachmentList: () => null,
}));

vi.mock('@/components/email/InsertPaymentLinkDialog', () => ({
  InsertPaymentLinkDialog: () => null,
}));

vi.mock('@/components/html-email-editor/MergeTagsBar', () => ({
  MergeTagsBar: () => null,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// Import after mocks
import { SimpleEmailComposer } from '@/components/email/SimpleEmailComposer';
import { toast } from 'sonner';

const defaultRecipient = {
  email: 'joao@example.com',
  name: 'João Silva',
  entityType: 'contact' as const,
  entityId: 'c-1',
};

describe('SimpleEmailComposer', () => {
  it('renders the 3 steps with labels', () => {
    render(<SimpleEmailComposer recipient={defaultRecipient} />);
    expect(screen.getByText('Para quem?')).toBeInTheDocument();
    expect(screen.getByText('Qual é o assunto?')).toBeInTheDocument();
    expect(screen.getByText('Qual é a mensagem?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar email/i })).toBeInTheDocument();
  });

  it('pre-fills recipient from props', () => {
    render(<SimpleEmailComposer recipient={defaultRecipient} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('shows validation errors when sending with empty fields', async () => {
    render(<SimpleEmailComposer recipient={defaultRecipient} />);
    const sendBtn = screen.getByRole('button', { name: /enviar email/i });
    await userEvent.click(sendBtn);
    expect(screen.getByText('O assunto não pode ficar vazio.')).toBeInTheDocument();
    expect(screen.getByText('Escreve uma mensagem antes de enviar.')).toBeInTheDocument();
  });

  it('hides advanced options by default', () => {
    render(<SimpleEmailComposer recipient={defaultRecipient} />);
    expect(screen.getByText('Mais opções')).toBeInTheDocument();
    // CC field should not be visible
    expect(screen.queryByText('CC:')).not.toBeInTheDocument();
  });

  it('reveals advanced options when clicked', async () => {
    render(<SimpleEmailComposer recipient={defaultRecipient} />);
    await userEvent.click(screen.getByText('Mais opções'));
    expect(screen.getByText('CC:')).toBeInTheDocument();
    expect(screen.getByText('BCC:')).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<SimpleEmailComposer recipient={defaultRecipient} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
