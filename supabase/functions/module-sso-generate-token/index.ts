import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface GenerateTokenRequest {
  module_id: string;
  integration_mode: 'embed' | 'redirect' | 'headless';
  workspace_id: string;
}

interface ContextPayload {
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'MISSING_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate user token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;

    // Parse request body
    const body: GenerateTokenRequest = await req.json();
    const { module_id, integration_mode, workspace_id } = body;

    if (!module_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', code: 'INVALID_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const userAgent = req.headers.get('user-agent') || null;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null;

    // Create service client for privileged operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check module access using the database function
    const { data: accessCheck, error: accessError } = await serviceClient
      .rpc('check_module_access', {
        p_workspace_id: workspace_id,
        p_module_id: module_id,
        p_user_id: userId
      });

    if (accessError) {
      console.error('Access check error:', accessError);
      return new Response(
        JSON.stringify({ error: 'Failed to check access', code: 'ACCESS_CHECK_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accessCheck?.allowed) {
      // Log access denied
      await serviceClient.from('module_access_logs').insert({
        workspace_id,
        user_id: userId,
        module_id,
        action_type: 'access_denied',
        action_details: { reason: accessCheck?.reason },
        success: false,
        error_message: accessCheck?.reason,
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ 
          error: 'Access denied', 
          code: 'ACCESS_DENIED',
          reason: accessCheck?.reason 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get workspace info
    const { data: workspace } = await serviceClient
      .from('workspaces')
      .select('name, slug')
      .eq('id', workspace_id)
      .single();

    // Get user profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    // Get module permissions from marketplace_modules
    const { data: moduleData } = await serviceClient
      .from('marketplace_modules')
      .select('permissions')
      .eq('id', module_id)
      .single();

    // Get active modules for this workspace
    const { data: activeModules } = await serviceClient
      .from('workspace_modules')
      .select('module_id')
      .eq('workspace_id', workspace_id)
      .in('status', ['active', 'trial']);

    // Build granted scopes from module permissions
    const grantedScopes: string[] = [];
    if (moduleData?.permissions?.data_permissions) {
      for (const perm of moduleData.permissions.data_permissions) {
        if (perm.read) grantedScopes.push(`read:${perm.entity}`);
        if (perm.write) grantedScopes.push(`write:${perm.entity}`);
        if (perm.delete) grantedScopes.push(`delete:${perm.entity}`);
      }
    }

    // Build context payload
    const contextPayload: ContextPayload = {
      workspace_id,
      workspace_name: workspace?.name || 'Unknown',
      user_id: userId,
      user_name: profile?.full_name || userEmail.split('@')[0],
      user_email: userEmail,
      user_role: accessCheck.user_role,
      language: 'pt-PT', // Could be from user preferences
      timezone: 'Europe/Lisbon', // Could be from user preferences
      environment: 'production',
      module_id,
      granted_scopes: grantedScopes,
      active_modules: activeModules?.map(m => m.module_id) || []
    };

    // Generate secure tokens
    const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const accessToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const nonce = crypto.randomUUID();

    // Hash the access token for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(accessToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Session expires in 8 hours
    const sessionExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    // Token expires in 5 minutes (short-lived for initial validation)
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Create SSO session
    const { data: session, error: sessionError } = await serviceClient
      .from('module_sso_sessions')
      .insert({
        workspace_id,
        user_id: userId,
        module_id,
        session_token: sessionToken,
        integration_mode: integration_mode || 'embed',
        context_snapshot: contextPayload,
        granted_scopes: grantedScopes,
        expires_at: sessionExpiresAt.toISOString(),
        user_agent: userAgent,
        ip_address: clientIp
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session', code: 'SESSION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create SSO token
    const { error: tokenError } = await serviceClient
      .from('module_sso_tokens')
      .insert({
        session_id: session.id,
        workspace_id,
        user_id: userId,
        module_id,
        token: accessToken,
        token_hash: tokenHash,
        nonce,
        expires_at: tokenExpiresAt.toISOString(),
        ip_address: clientIp,
        user_agent: userAgent
      });

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      // Cleanup session
      await serviceClient.from('module_sso_sessions').delete().eq('id', session.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create token', code: 'TOKEN_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful token generation
    await serviceClient.from('module_access_logs').insert({
      workspace_id,
      user_id: userId,
      module_id,
      session_id: session.id,
      action_type: 'token_generated',
      action_details: { 
        integration_mode,
        scopes_count: grantedScopes.length 
      },
      success: true,
      ip_address: clientIp,
      user_agent: userAgent
    });

    // Return token and context
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          access_token: accessToken,
          session_id: session.id,
          expires_at: tokenExpiresAt.toISOString(),
          context: contextPayload,
          nonce
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('SSO generate token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
