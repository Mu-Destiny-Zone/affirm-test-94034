import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase Admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize regular client for RLS checks
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the requesting user is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { email, display_name, org_id, project_id, role, project_role } = body || {};

    if (!email || !org_id || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, org_id, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Check if requesting user is admin of the organization
    const { data: orgMember } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', org_id)
      .eq('profile_id', user.id)
      .single();

    if (!orgMember || orgMember.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12);

    // Create user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: {
        display_name,
        temp_password: true
      },
      email_confirm: true
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add user to organization
    const { error: orgError } = await supabaseAdmin
      .from('org_members')
      .insert({
        org_id,
        profile_id: newUser.user.id,
        role
      });

    if (orgError) {
      console.error('Error adding to org:', orgError);
      // Clean up: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to add user to organization' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add to project if specified
    if (project_id && project_role) {
      const { error: projectError } = await supabaseAdmin
        .from('project_members')
        .insert({
          project_id,
          profile_id: newUser.user.id,
          role_override: project_role
        });

      if (projectError) {
        console.error('Error adding to project:', projectError);
        // Note: We don't clean up here as the user is already in the org
      }
    }

    // Log activity
    await supabaseAdmin
      .from('activity_log')
      .insert({
        org_id,
        project_id: project_id || null,
        actor_id: user.id,
        action: 'user_created',
        entity: 'user',
        entity_id: newUser.user.id,
        meta: {
          user_id: newUser.user.id,
          role,
          project_role: project_role || null
        }
      });

    return new Response(
      JSON.stringify({ 
        user: newUser.user,
        temporary_password: tempPassword,
        message: 'User created successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});