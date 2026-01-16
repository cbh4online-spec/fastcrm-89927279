import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ValidateTokenRequest {
  access_token: string;
  nonce: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: ValidateTokenRequest = await req.json();
    const { access_token, nonce } = body;

    if (!access_token || !nonce) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', code: 'INVALID_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const userAgent = req.headers.get('user-agent') || null;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null;

    // Create service client (this endpoint is called by external apps)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Hash the provided token to find it
    const encoder = new TextEncoder();
    const data = encoder.encode(access_token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find the token
    const { data: tokenData, error: tokenError } = await serviceClient
      .from('module_sso_tokens')
      .select(`
        *,
        session:module_sso_sessions(*)
      `)
      .eq('token_hash', tokenHash)
      .single();

    if (tokenError || !tokenData) {
      // Log failed validation
      await serviceClient.from('module_access_logs').insert({
        workspace_id: '00000000-0000-0000-0000-000000000000', // Unknown
        action_type: 'token_validated',
        action_details: { error: 'token_not_found' },
        success: false,
        error_message: 'Token not found',
        error_code: 'TOKEN_NOT_FOUND',
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ error: 'Invalid token', code: 'TOKEN_NOT_FOUND' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate nonce
    if (tokenData.nonce !== nonce) {
      await serviceClient.from('module_access_logs').insert({
        workspace_id: tokenData.workspace_id,
        user_id: tokenData.user_id,
        module_id: tokenData.module_id,
        session_id: tokenData.session_id,
        action_type: 'token_validated',
        action_details: { error: 'invalid_nonce' },
        success: false,
        error_message: 'Invalid nonce',
        error_code: 'INVALID_NONCE',
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ error: 'Invalid nonce', code: 'INVALID_NONCE' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token status
    if (tokenData.status === 'used') {
      return new Response(
        JSON.stringify({ error: 'Token already used', code: 'TOKEN_USED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.status === 'expired' || new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expired', code: 'TOKEN_EXPIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'Token revoked', code: 'TOKEN_REVOKED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check session is still active
    const session = tokenData.session;
    if (!session?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Session inactive', code: 'SESSION_INACTIVE' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session expired', code: 'SESSION_EXPIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used (single-use)
    await serviceClient
      .from('module_sso_tokens')
      .update({ 
        status: 'used',
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id);

    // Update session last activity
    await serviceClient
      .from('module_sso_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);

    // Log successful validation
    await serviceClient.from('module_access_logs').insert({
      workspace_id: tokenData.workspace_id,
      user_id: tokenData.user_id,
      module_id: tokenData.module_id,
      session_id: tokenData.session_id,
      action_type: 'token_validated',
      action_details: { 
        token_id: tokenData.id,
        session_id: session.id
      },
      success: true,
      ip_address: clientIp,
      user_agent: userAgent
    });

    // Return session context
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          session_id: session.id,
          session_token: session.session_token,
          context: session.context_snapshot,
          granted_scopes: session.granted_scopes,
          expires_at: session.expires_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('SSO validate token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
