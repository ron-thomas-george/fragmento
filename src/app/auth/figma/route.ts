import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    
    if (!state) {
      return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 });
    }

    // Redirect to the authorization page
    const authorizeUrl = new URL('/auth/figma/authorize', request.url);
    authorizeUrl.searchParams.set('state', state);
    
    return NextResponse.redirect(authorizeUrl);
    
  } catch (error) {
    console.error('Figma auth redirect error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
