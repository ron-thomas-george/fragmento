import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// CORS headers for Figma plugin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (decoded.type !== 'figma_plugin') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Fetch organizations for the user
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('owner_id', decoded.userId);

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    return NextResponse.json(organizations, { headers: corsHeaders });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
