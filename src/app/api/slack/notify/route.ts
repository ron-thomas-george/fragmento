import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { webhook_url, message } = await request.json();

    if (!webhook_url) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Send the notification to Slack webhook from server-side
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: 'Failed to send notification to Slack',
          details: errorText,
          status: response.status 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent successfully to Slack!' 
    });

  } catch (error: any) {
    console.error('Slack notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
