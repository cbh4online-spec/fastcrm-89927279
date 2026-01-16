// SSO + Context Bridge Types
// ===========================

export interface SSOContextPayload {
  workspace_id: string;
  workspace_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  language: string;
  timezone: string;
  environment: 'production' | 'staging';
  module_id: string;
  granted_scopes: string[];
  active_modules: string[];
}

export interface SSOTokenResponse {
  success: boolean;
  data?: {
    access_token: string;
    session_id: string;
    expires_at: string;
    context: SSOContextPayload;
    nonce: string;
  };
  error?: string;
  code?: string;
  reason?: string;
}

export interface SSOValidateResponse {
  success: boolean;
  data?: {
    session_id: string;
    session_token: string;
    context: SSOContextPayload;
    granted_scopes: string[];
    expires_at: string;
  };
  error?: string;
  code?: string;
}

export interface ContextBridgeResponse {
  success: boolean;
  data?: {
    context: SSOContextPayload;
    granted_scopes: string[];
    session_expires_at: string;
  };
  error?: string;
  code?: string;
}

export interface ActionExecuteResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  code?: string;
  details?: string;
}

export type IntegrationMode = 'embed' | 'redirect' | 'headless';

export interface ModuleFrameConfig {
  module_id: string;
  app_url: string;
  integration_mode: IntegrationMode;
  workspace_id: string;
  
  // Iframe settings (for embed mode)
  allow_fullscreen?: boolean;
  allow_camera?: boolean;
  allow_microphone?: boolean;
  sandbox?: string[];
  
  // Callbacks
  onLoad?: () => void;
  onError?: (error: string) => void;
  onMessage?: (message: ModuleMessage) => void;
}

export interface ModuleMessage {
  type: 'action' | 'navigation' | 'notification' | 'context_request' | 'close';
  payload: Record<string, unknown>;
}

// Scopes that can be granted to modules
export type ScopeEntity = 
  | 'leads'
  | 'contacts'
  | 'companies'
  | 'opportunities'
  | 'products'
  | 'proposals'
  | 'invoices'
  | 'conversations'
  | 'templates'
  | 'automations'
  | 'notes'
  | 'activities';

export type ScopeAction = 'read' | 'write' | 'delete';

export type Scope = `${ScopeAction}:${ScopeEntity}`;

// Session status
export interface ModuleSessionStatus {
  isActive: boolean;
  sessionId: string | null;
  expiresAt: Date | null;
  moduleId: string | null;
  error: string | null;
}

// Access check result
export interface ModuleAccessCheck {
  allowed: boolean;
  reason?: string;
  user_role?: string;
  module_status?: string;
  settings?: Record<string, unknown>;
}

// Action types that can be executed via context bridge
export type ModuleActionType = 
  | 'create_lead'
  | 'update_lead'
  | 'create_contact'
  | 'update_contact'
  | 'create_note'
  | 'create_activity'
  | 'create_opportunity'
  | 'update_opportunity';

// Error codes
export type SSOErrorCode = 
  | 'MISSING_AUTH'
  | 'INVALID_TOKEN'
  | 'INVALID_REQUEST'
  | 'ACCESS_CHECK_FAILED'
  | 'ACCESS_DENIED'
  | 'SESSION_ERROR'
  | 'TOKEN_ERROR'
  | 'TOKEN_NOT_FOUND'
  | 'INVALID_NONCE'
  | 'TOKEN_USED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_INACTIVE'
  | 'SESSION_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'ACTION_FAILED'
  | 'UNKNOWN_ACTION'
  | 'UNKNOWN_ACTION_TYPE'
  | 'INTERNAL_ERROR';

// Error messages in Portuguese
export const SSO_ERROR_MESSAGES: Record<SSOErrorCode, string> = {
  MISSING_AUTH: 'Autenticação não encontrada',
  INVALID_TOKEN: 'Token inválido',
  INVALID_REQUEST: 'Pedido inválido',
  ACCESS_CHECK_FAILED: 'Falha ao verificar acesso',
  ACCESS_DENIED: 'Acesso negado',
  SESSION_ERROR: 'Erro ao criar sessão',
  TOKEN_ERROR: 'Erro ao criar token',
  TOKEN_NOT_FOUND: 'Token não encontrado',
  INVALID_NONCE: 'Nonce inválido',
  TOKEN_USED: 'Token já utilizado',
  TOKEN_EXPIRED: 'Token expirado',
  TOKEN_REVOKED: 'Token revogado',
  SESSION_NOT_FOUND: 'Sessão não encontrada',
  SESSION_INACTIVE: 'Sessão inativa',
  SESSION_EXPIRED: 'Sessão expirada',
  PERMISSION_DENIED: 'Permissão negada',
  ACTION_FAILED: 'Ação falhou',
  UNKNOWN_ACTION: 'Ação desconhecida',
  UNKNOWN_ACTION_TYPE: 'Tipo de ação desconhecido',
  INTERNAL_ERROR: 'Erro interno do servidor'
};

// Access denied reasons in Portuguese
export const ACCESS_DENIED_REASONS: Record<string, string> = {
  not_workspace_member: 'Não é membro deste workspace',
  module_not_installed: 'Módulo não instalado',
  module_not_active: 'Módulo não está ativo',
  trial_expired: 'Período de teste expirado',
  billing_issue: 'Problema de faturação',
  suspended: 'Acesso suspenso'
};
