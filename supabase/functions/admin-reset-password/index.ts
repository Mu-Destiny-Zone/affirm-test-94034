const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceRoleKey,
        hasAnonKey: !!supabaseAnonKey
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error. Missing required environment variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header. Please ensure you are logged in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
    });

    if (!verifyResponse.ok) {
      console.error('Token verification failed:', verifyResponse.status);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Your session may have expired. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUser = await verifyResponse.json();

    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      console.error('Missing required fields:', { hasUserId: !!userId, hasPassword: !!newPassword });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and newPassword are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 6) {
      console.error('Password too short:', newPassword.length);
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing password reset request for user:', userId, 'by admin:', requestingUser.id);

    const checkAdminResponse = await fetch(`${supabaseUrl}/rest/v1/org_members?profile_id=eq.${requestingUser.id}&select=role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
    });

    if (!checkAdminResponse.ok) {
      console.error('Failed to check admin status:', checkAdminResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgMemberships = await checkAdminResponse.json();
    console.log('User org memberships:', orgMemberships);
    const isAdmin = orgMemberships.some((membership: any) => membership.role === 'admin');

    if (!isAdmin) {
      console.error('User is not an admin:', requestingUser.id);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. You must be an admin to reset passwords.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verification passed. Proceeding with password reset.');

    const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'apikey': supabaseServiceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: newPassword,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('Supabase Admin API error:', updateResponse.status, errorData);
      return new Response(
        JSON.stringify({ error: errorData.message || errorData.msg || 'Failed to reset password in the authentication system' }),
        { status: updateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Password reset successful for user:', userId);

    return new Response(
      JSON.stringify({ message: 'Password reset successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error resetting password:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: `An unexpected error occurred: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});