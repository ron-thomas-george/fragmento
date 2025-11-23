'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ExternalLink, Shield, Database, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

function FigmaAuthorizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const state = searchParams.get('state');
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('Checking auth status...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth check error:', error);
        setError('Failed to check authentication status');
        return;
      }

      if (!user) {
        console.log('No user found, redirecting to signin');
        // Redirect to sign in with return URL
        const returnUrl = `/auth/figma/authorize?state=${state}`;
        router.push(`/signin?redirect=${encodeURIComponent(returnUrl)}`);
        return;
      }

      console.log('User found:', user.email);
      setUser(user as User);
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Authentication check failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    console.log('handleAuthorize called', { user: user?.email, state });
    if (!user || !state) return;

    setAuthorizing(true);
    setError(null);

    try {
      // Generate authentication token
      const response = await fetch('/api/auth/figma/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          state: state,
        }),
      });

      if (!response.ok) {
        throw new Error('Authorization failed');
      }

      const { token, expiresIn } = await response.json();

      // Store token for plugin polling
      await fetch('/api/figma/poll-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: state,
          token: token,
          userId: user.id,
          expiresIn: expiresIn
        }),
      });

      setError(null);
      
      // Show success state instead of alert
      setAuthorizing(false);
      
      // Redirect to success page or show success UI
      router.push('/auth/figma/success');
      
    } catch (err) {
      setError('Authorization failed. Please try again.');
    } finally {
      setAuthorizing(false);
    }
  };

  const handleDeny = () => {
    // Redirect back to Figma with error
    const figmaUrl = `figma://auth-callback?error=access_denied&state=${state}`;
    window.location.href = figmaUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-primary">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M17.1834 0.585787C16.8083 0.210715 16.2996 0 15.7692 0H8.23084C7.70041 0 7.19171 0.210713 6.81663 0.585785L0.585787 6.81662C0.210714 7.19169 0 7.7004 0 8.23083V15.7692C0 16.2996 0.210714 16.8083 0.585786 17.1834L6.81663 23.4142C7.19171 23.7893 7.70041 24 8.23085 24H15.7692C16.2996 24 16.8083 23.7893 17.1834 23.4142L23.4142 17.1834C23.7893 16.8083 24 16.2996 24 15.7692V8.23083C24 7.7004 23.7893 7.19169 23.4142 6.81662L17.1834 0.585787ZM8.6747 16.7132L5.34675 13.3853C4.5657 12.6042 4.5657 11.3379 5.34675 10.5569L8.6747 7.22892C10.4675 5.43614 13.4169 5.43614 15.2096 7.22892L18.5376 10.5569C19.3186 11.3379 19.3186 12.6042 18.5376 13.3853L15.2096 16.7132C13.4169 18.506 10.5253 18.506 8.6747 16.7132Z"
                fill="white"
              />
            </svg>
          </div>
          <CardTitle className="text-xl font-semibold">Authorize Fragmento Plugin</CardTitle>
          <CardDescription>
            The Fragmento Figma plugin is requesting access to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {user.user_metadata.full_name?.[0] || user.email[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{user.user_metadata.full_name || 'User'}</p>
                <p className="text-xs text-gray-600">{user.email}</p>
              </div>
            </div>
          )}

          {/* Permissions */}
          <div>
            <h3 className="font-medium text-sm mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-600" />
              This plugin will be able to:
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Read and write Figma variables</p>
                  <p className="text-xs text-gray-600">Access your design tokens and variables in Figma files</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Database className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Access your projects and tokens</p>
                  <p className="text-xs text-gray-600">View and manage your Fragmento projects and design tokens</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <RefreshCw className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Sync changes between Figma and web app</p>
                  <p className="text-xs text-gray-600">Push variable changes to your Fragmento projects</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-900">Secure Connection</p>
                <p className="text-xs text-blue-700">
                  Your authentication token will be securely stored and can be revoked at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-900">Authorization Error</p>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={handleDeny}
              variant="outline"
              className="flex-1"
              disabled={authorizing}
            >
              Deny
            </Button>
            <Button
              onClick={handleAuthorize}
              className="flex-1"
              disabled={authorizing || !user}
            >
              {authorizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Authorizing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Authorize
                </>
              )}
            </Button>
          </div>

          {/* Help */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Need help?{' '}
              <a href="/support" className="text-blue-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FigmaAuthorizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authorization...</p>
        </div>
      </div>
    }>
      <FigmaAuthorizeContent />
    </Suspense>
  );
}
