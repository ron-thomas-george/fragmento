import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    
    if (!state) {
      return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 });
    }

    // Get the current user session
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/signin?redirect=figma-auth', request.url));
    }

    // Generate a JWT token for the Figma plugin
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        type: 'figma_plugin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Create the callback URL that will be handled by Figma
    const callbackUrl = `figma://auth-callback?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(user.id)}&expiresIn=604800&state=${encodeURIComponent(state)}`;
    
    // Return an HTML page that will redirect to Figma
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fragmento - Figma Authentication</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f9fafb;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            .logo {
              width: 48px;
              height: 48px;
              margin: 0 auto 1rem;
              background: #6366f1;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            h1 {
              color: #1f2937;
              margin-bottom: 0.5rem;
            }
            p {
              color: #6b7280;
              margin-bottom: 1.5rem;
            }
            .success {
              color: #059669;
              font-weight: 500;
            }
            .button {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background: #6366f1;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              margin-top: 1rem;
            }
            .button:hover {
              background: #5856eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
              </svg>
            </div>
            <h1>Authentication Successful</h1>
            <p class="success">You have successfully authenticated with Fragmento!</p>
            <p>You can now close this window and return to Figma. The plugin should automatically connect to your account.</p>
            <a href="#" onclick="window.close()" class="button">Close Window</a>
          </div>
          
          <script>
            // Attempt to redirect to Figma
            setTimeout(() => {
              window.location.href = '${callbackUrl}';
            }, 2000);
            
            // Also try to close the window after a delay
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
  } catch (error) {
    console.error('Figma auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
