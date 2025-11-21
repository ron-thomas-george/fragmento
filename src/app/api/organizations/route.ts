import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { verify } from 'jsonwebtoken';

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
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    let decoded: any;
    try {
      decoded = verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = await createSupabaseServerClient();
    
    // Fetch organizations for the user
    console.log('Fetching organizations for user:', decoded.userId);
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('owner_id', decoded.userId);

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Organizations found:', organizations?.length || 0);
    return NextResponse.json(organizations || [], { headers: corsHeaders });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
