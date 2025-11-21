import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import jwt from 'jsonwebtoken';

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
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

    const supabase = createSupabaseServerClient();
    
    // First verify the user has access to this organization
    const { data: orgAccess, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', params.organizationId)
      .eq('owner_id', decoded.userId)
      .single();

    if (orgError || !orgAccess) {
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 });
    }

    // Fetch projects for the organization
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .eq('organization_id', params.organizationId);

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    return NextResponse.json(projects);
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
