import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') || '';

    // Client (RLS) for auth/permission checks bound to caller
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Admin client to bypass RLS for final query
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const org_id: string | undefined = body?.org_id;

    if (!org_id) {
      return new Response(JSON.stringify({ error: 'org_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Permission: org admin/manager or org owner
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', org_id)
      .eq('profile_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let allowed = membership?.role === 'admin' || membership?.role === 'manager';

    if (!allowed) {
      const { data: org } = await supabase
        .from('orgs')
        .select('owner_id')
        .eq('id', org_id)
        .is('deleted_at', null)
        .maybeSingle();
      allowed = !!org && org.owner_id === user.id;
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get all profiles and memberships using service role
    const [{ data: profiles, error: profilesErr }, { data: memberships, error: memErr }] = await Promise.all([
      admin.from('profiles').select('id, email, display_name, created_at, deleted_at'),
      admin.from('org_members').select('profile_id').is('deleted_at', null)
    ]);

    if (profilesErr || memErr) {
      const msg = profilesErr?.message || memErr?.message || 'Query error';
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const memberIds = new Set((memberships || []).map((m: any) => m.profile_id));
    const users = (profiles || []).filter((p: any) => !memberIds.has(p.id));

    return new Response(JSON.stringify({ users }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('list-unassigned-users error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});