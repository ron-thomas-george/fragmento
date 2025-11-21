import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { webhook_url, channel_name } = await request.json();

    if (!webhook_url) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Test message to send to Slack
    const testMessage = {
      text: "🔗 Fragmento integration test - your Slack integration is working!",
      channel: channel_name || undefined
    };

    // Make the request to Slack webhook from server-side
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: 'Failed to send message to Slack',
          details: errorText,
          status: response.status 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test message sent successfully to Slack!' 
    });

  } catch (error: any) {
    console.error('Slack test error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
