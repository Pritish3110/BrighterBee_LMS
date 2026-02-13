import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header and extract token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract JWT from Bearer token
    const token = authHeader.replace('Bearer ', '')

    // Create Supabase admin client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user with the token using admin client
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) {
      console.error('User verification failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin using admin client
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // List all auth users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
    if (authError) {
      throw authError
    }

    // Get profiles data
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      throw profilesError
    }

    // Get roles data
    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('user_id, role')

    if (rolesError) {
      throw rolesError
    }

    // Create lookup maps
    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || [])

    // Combine data
    const usersWithDetails = profiles?.map(profile => ({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      email: emailMap.get(profile.id) || null,
      role: roleMap.get(profile.id) || 'student',
    })) || []

    return new Response(
      JSON.stringify({ users: usersWithDetails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in list-users function:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
