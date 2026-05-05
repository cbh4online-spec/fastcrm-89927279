// Shared Z-API helper for all whatsapp-zapi-* edge functions

const ZAPI_BASE = 'https://api.z-api.io';

export interface ZapiCredentials {
  instanceId: string;
  instanceToken: string;
  clientToken: string;
}

export interface ZapiMasterCredentials {
  accountToken: string;   // Master account token (for instance management)
  adminToken: string;     // Client-Token header (security token)
}

export function getMasterCredentials(): ZapiMasterCredentials {
  const accountToken = Deno.env.get('ZAPI_MASTER_ACCOUNT_TOKEN');
  const adminToken = Deno.env.get('ZAPI_MASTER_ADMIN_TOKEN');
  if (!accountToken || !adminToken) {
    throw new Error('Z-API master credentials not configured');
  }
  return { accountToken, adminToken };
}

/**
 * Call Z-API instance endpoint (per-instance operations like QR, send, status).
 */
export async function zapiCall(
  creds: ZapiCredentials,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${ZAPI_BASE}/instances/${creds.instanceId}/token/${creds.instanceToken}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Client-Token': creds.clientToken,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(url, { ...init, headers });
}

/**
 * Call Z-API master account endpoint (for creating/listing/deleting instances).
 * Endpoint: https://api.z-api.io/account/{ACCOUNT_TOKEN}/...
 */
export async function zapiMasterCall(
  master: ZapiMasterCredentials,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${ZAPI_BASE}/account/${master.accountToken}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Client-Token': master.adminToken,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(url, { ...init, headers });
}

export async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
