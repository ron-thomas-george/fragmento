'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink } from 'lucide-react';

export default function FigmaAuthSuccessPage() {
  useEffect(() => {
    // Auto-close window after 5 seconds if opened in popup
    const timer = setTimeout(() => {
      if (window.opener) {
        window.close();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleCloseWindow = () => {
    if (window.opener) {
      window.close();
    } else {
      // If not in popup, redirect to dashboard
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-green-900">
            Authentication Successful
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-green-700 font-medium mb-2">
              You have successfully authenticated with Fragmento!
            </p>
            <p className="text-sm text-gray-600 mb-4">
              You can now close this window and return to Figma. 
              The plugin should automatically connect to your account.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>Next steps:</strong> Return to Figma and the plugin will automatically 
              detect your authorization. You can now sync your design tokens!
            </p>
          </div>

          <Button 
            onClick={handleCloseWindow}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Close Window
          </Button>

          <p className="text-xs text-gray-500">
            This window will automatically close in 5 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
