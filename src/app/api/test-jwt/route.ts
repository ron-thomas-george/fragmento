import { NextRequest, NextResponse } from 'next/server';
import { sign, verify } from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      return NextResponse.json({ error: 'JWT_SECRET not configured' }, { status: 500 });
    }

    // Test token generation
    const testPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    };

    const token = sign(testPayload, jwtSecret, { algorithm: 'HS256' });
    
    // Test token verification
    let decoded;
    try {
      decoded = verify(token, jwtSecret);
    } catch (verifyError: any) {
      return NextResponse.json({ 
        error: 'Token verification failed', 
        details: verifyError?.message || 'Unknown verification error'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'JWT generation and verification working',
      tokenGenerated: !!token,
      tokenVerified: !!decoded,
      payload: decoded
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'JWT test failed', 
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
