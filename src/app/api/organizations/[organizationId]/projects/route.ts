import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ organizationId: string }> }
) {
  try {
    // Await the params since they're now async in Next.js 15+
    const { organizationId } = await context.params;
    
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

    const supabase = createSupabaseAdminClient();
    
    // First verify the user has access to this organization
    const { data: orgAccess, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .eq('owner_id', decoded.userId)
      .single();

    if (orgError || !orgAccess) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' }, 
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch projects for the organization
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, organization_id, description, slug, created_at')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(projects || [], { headers: corsHeaders });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
