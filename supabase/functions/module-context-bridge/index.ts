import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ContextBridgeRequest {
  session_token: string;
  action?: 'get_context' | 'refresh_context' | 'execute_action';
  action_type?: string;
  action_data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: ContextBridgeRequest = await req.json();
    const { session_token, action = 'get_context', action_type, action_data } = body;

    if (!session_token) {
      return new Response(
        JSON.stringify({ error: 'Missing session token', code: 'INVALID_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const userAgent = req.headers.get('user-agent') || null;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null;

    // Create service client
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find the session
    const { data: session, error: sessionError } = await serviceClient
      .from('module_sso_sessions')
      .select('*')
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid session', code: 'SESSION_NOT_FOUND' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session
    if (!session.is_active) {
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

    // Update last activity
    await serviceClient
      .from('module_sso_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);

    // Handle different actions
    switch (action) {
      case 'get_context':
        return handleGetContext(serviceClient, session, clientIp, userAgent);
      
      case 'refresh_context':
        return handleRefreshContext(serviceClient, session, clientIp, userAgent);
      
      case 'execute_action':
        if (!action_type) {
          return new Response(
            JSON.stringify({ error: 'Missing action_type', code: 'INVALID_REQUEST' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return handleExecuteAction(serviceClient, session, action_type, action_data || {}, clientIp, userAgent);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action', code: 'UNKNOWN_ACTION' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Context bridge error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleGetContext(
  serviceClient: any, 
  session: any,
  clientIp: string | null,
  userAgent: string | null
) {
  // Log context fetch
  await serviceClient.from('module_access_logs').insert({
    workspace_id: session.workspace_id,
    user_id: session.user_id,
    module_id: session.module_id,
    session_id: session.id,
    action_type: 'context_fetched',
    success: true,
    ip_address: clientIp,
    user_agent: userAgent
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        context: session.context_snapshot,
        granted_scopes: session.granted_scopes,
        session_expires_at: session.expires_at
      }
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function handleRefreshContext(
  serviceClient: any, 
  session: any,
  clientIp: string | null,
  userAgent: string | null
) {
  // Get fresh workspace info
  const { data: workspace } = await serviceClient
    .from('workspaces')
    .select('name, slug')
    .eq('id', session.workspace_id)
    .single();

  // Get fresh user profile
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('full_name')
    .eq('user_id', session.user_id)
    .single();

  // Get workspace member role
  const { data: member } = await serviceClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspace_id)
    .eq('user_id', session.user_id)
    .single();

  // Get active modules
  const { data: activeModules } = await serviceClient
    .from('workspace_modules')
    .select('module_id')
    .eq('workspace_id', session.workspace_id)
    .in('status', ['active', 'trial']);

  // Build fresh context
  const freshContext = {
    ...session.context_snapshot,
    workspace_name: workspace?.name || session.context_snapshot.workspace_name,
    user_name: profile?.full_name || session.context_snapshot.user_name,
    user_role: member?.role || session.context_snapshot.user_role,
    active_modules: activeModules?.map((m: any) => m.module_id) || session.context_snapshot.active_modules
  };

  // Update session with fresh context
  await serviceClient
    .from('module_sso_sessions')
    .update({ 
      context_snapshot: freshContext,
      last_activity_at: new Date().toISOString()
    })
    .eq('id', session.id);

  // Log refresh
  await serviceClient.from('module_access_logs').insert({
    workspace_id: session.workspace_id,
    user_id: session.user_id,
    module_id: session.module_id,
    session_id: session.id,
    action_type: 'context_refreshed',
    success: true,
    ip_address: clientIp,
    user_agent: userAgent
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        context: freshContext,
        granted_scopes: session.granted_scopes,
        session_expires_at: session.expires_at
      }
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function handleExecuteAction(
  serviceClient: any, 
  session: any,
  actionType: string,
  actionData: Record<string, unknown>,
  clientIp: string | null,
  userAgent: string | null
) {
  // Check if action is allowed based on granted scopes
  const allowedActions: Record<string, string[]> = {
    'create_lead': ['write:leads'],
    'update_lead': ['write:leads'],
    'create_contact': ['write:contacts'],
    'update_contact': ['write:contacts'],
    'create_note': ['write:notes'],
    'create_activity': ['write:activities'],
    'create_opportunity': ['write:opportunities'],
    'update_opportunity': ['write:opportunities']
  };

  const requiredScopes = allowedActions[actionType];
  if (!requiredScopes) {
    return new Response(
      JSON.stringify({ error: 'Unknown action type', code: 'UNKNOWN_ACTION_TYPE' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const hasPermission = requiredScopes.some(scope => 
    session.granted_scopes.includes(scope)
  );

  if (!hasPermission) {
    await serviceClient.from('module_access_logs').insert({
      workspace_id: session.workspace_id,
      user_id: session.user_id,
      module_id: session.module_id,
      session_id: session.id,
      action_type: 'action_executed',
      action_details: { 
        requested_action: actionType,
        error: 'permission_denied' 
      },
      success: false,
      error_message: 'Permission denied',
      error_code: 'PERMISSION_DENIED',
      ip_address: clientIp,
      user_agent: userAgent
    });

    return new Response(
      JSON.stringify({ error: 'Permission denied', code: 'PERMISSION_DENIED' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Execute the action
  let result: any = null;
  let error: any = null;

  try {
    switch (actionType) {
      case 'create_lead':
        const { data: lead, error: leadError } = await serviceClient
          .from('leads')
          .insert({
            workspace_id: session.workspace_id,
            created_by: session.user_id,
            ...actionData
          })
          .select()
          .single();
        result = lead;
        error = leadError;
        break;

      case 'create_contact':
        const { data: contact, error: contactError } = await serviceClient
          .from('contacts')
          .insert({
            workspace_id: session.workspace_id,
            created_by: session.user_id,
            ...actionData
          })
          .select()
          .single();
        result = contact;
        error = contactError;
        break;

      case 'create_activity':
        const { data: activity, error: activityError } = await serviceClient
          .from('crm_activities')
          .insert({
            workspace_id: session.workspace_id,
            performed_by: session.user_id,
            ...actionData
          })
          .select()
          .single();
        result = activity;
        error = activityError;
        break;

      default:
        error = { message: 'Action not implemented' };
    }
  } catch (e) {
    error = e;
  }

  // Log the action
  await serviceClient.from('module_access_logs').insert({
    workspace_id: session.workspace_id,
    user_id: session.user_id,
    module_id: session.module_id,
    session_id: session.id,
    action_type: 'action_executed',
    action_details: { 
      requested_action: actionType,
      result_id: result?.id
    },
    success: !error,
    error_message: error?.message,
    ip_address: clientIp,
    user_agent: userAgent
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Action failed', code: 'ACTION_FAILED', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: result
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
