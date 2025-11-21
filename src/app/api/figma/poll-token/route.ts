import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for tokens (in production, use Redis or database)
const tokenStorage = new Map<string, {
  token: string;
  userId: string;
  expiresIn: number;
  timestamp: number;
}>();

// Clean up old tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of tokenStorage.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) { // 5 minutes
      tokenStorage.delete(state);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const { state, token, userId, expiresIn } = await request.json();

    if (!state || !token || !userId || !expiresIn) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Store token for polling
    tokenStorage.set(state, {
      token,
      userId,
      expiresIn,
      timestamp: Date.now()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Token storage error:', error);
    return NextResponse.json(
      { error: 'Failed to store token' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    if (!state) {
      return NextResponse.json(
        { error: 'Missing state parameter' },
        { status: 400 }
      );
    }

    const tokenData = tokenStorage.get(state);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Remove token after retrieval (one-time use)
    tokenStorage.delete(state);

    return NextResponse.json({
      token: tokenData.token,
      userId: tokenData.userId,
      expiresIn: tokenData.expiresIn
    });

  } catch (error) {
    console.error('Token retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve token' },
      { status: 500 }
    );
  }
}
