import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email, unitId, role, fullName } = await req.json()

    if (!email || !unitId || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, unitId, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if the requesting user is an admin for the unit
    const { data: isAdmin } = await supabaseAdmin.rpc('is_unit_admin', { target_unit_id: unitId })
    
    // We need to check with the user's context, not admin context
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: adminCheck } = await userClient.rpc('is_unit_admin', { target_unit_id: unitId })
    
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'You must be an admin of this unit to invite users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let targetUserId: string

    if (existingUser) {
      targetUserId = existingUser.id
      
      // Check if already assigned to this unit
      const { data: existingAssignment } = await supabaseAdmin
        .from('user_units')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('unit_id', unitId)
        .single()
      
      if (existingAssignment) {
        return new Response(JSON.stringify({ error: 'User is already assigned to this unit' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      // Create new user with invite
      const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName || email.split('@')[0] }
      })

      if (inviteError) {
        console.error('Invite error:', inviteError)
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      targetUserId = newUser.user.id
    }

    // Assign user to unit with role
    const { error: assignError } = await supabaseAdmin
      .from('user_units')
      .insert({
        user_id: targetUserId,
        unit_id: unitId,
        role: role,
        invited_by: user.id
      })

    if (assignError) {
      console.error('Assignment error:', assignError)
      return new Response(JSON.stringify({ error: assignError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: existingUser ? 'User assigned to unit' : 'Invitation sent',
      userId: targetUserId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
