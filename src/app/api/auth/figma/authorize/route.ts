import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { sign } from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    console.log('Figma authorization request received');
    const { userId, state } = await request.json();
    console.log('Request data:', { userId: userId?.substring(0, 8) + '...', state });

    if (!userId || !state) {
      console.error('Missing required parameters:', { userId: !!userId, state: !!state });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    console.log('Creating Supabase server client...');
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('No user found in session');
      return NextResponse.json(
        { error: 'No authenticated user' },
        { status: 401 }
      );
    }

    if (user.id !== userId) {
      console.error('User ID mismatch:', { sessionUserId: user.id, requestUserId: userId });
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.email);

    // Generate JWT token for Figma plugin
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds
    const expiresAt = Date.now() + (expiresIn * 1000);

    const token = sign(
      {
        userId: user.id,
        email: user.email,
        state: state,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt / 1000),
      },
      jwtSecret,
      { algorithm: 'HS256' }
    );

    // Log the authorization for security
    console.log(`Figma plugin authorized for user ${user.email} (${user.id})`);

    return NextResponse.json({
      token,
      expiresIn,
      expiresAt,
      userId: user.id,
    });

  } catch (error) {
    console.error('Figma authorization error:', error);
    return NextResponse.json(
      { error: 'Authorization failed' },
      { status: 500 }
    );
  }
}
