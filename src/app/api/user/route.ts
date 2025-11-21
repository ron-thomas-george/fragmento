import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// CORS headers for Figma plugin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Verify the JWT token
    let decoded: any;
    try {
      decoded = verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user information from Supabase using service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(decoded.userId);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Return user information
    return NextResponse.json({
      id: user.user.id,
      email: user.user.email,
      full_name: user.user.user_metadata?.full_name || null,
      avatar_url: user.user.user_metadata?.avatar_url || null,
      created_at: user.user.created_at,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
