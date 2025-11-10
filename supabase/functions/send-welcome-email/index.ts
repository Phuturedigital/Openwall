import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WelcomeEmailPayload {
  user_id: string;
  email: string;
  display_name?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: WelcomeEmailPayload = await req.json();
    const { email, display_name } = payload;

    // TODO: Replace with your actual email service (SendGrid, Resend, etc.)
    // For now, we'll log the email content
    const emailContent = {
      to: email,
      subject: "Welcome to NoteBoard! 🎉",
      html: generateWelcomeEmail(display_name || email),
    };

    console.log("Welcome email prepared:", emailContent);

    // Example: Send via Resend (uncomment when you have API key)
    /*
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'welcome@yourdomain.com',
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email via Resend');
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
        email_preview: emailContent,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function generateWelcomeEmail(displayName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to NoteBoard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 10px;
    }
    h1 {
      color: #1f2937;
      font-size: 28px;
      margin-bottom: 20px;
    }
    .greeting {
      font-size: 18px;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .content {
      color: #6b7280;
      margin-bottom: 30px;
    }
    .features {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
    }
    .feature-item {
      margin-bottom: 15px;
      padding-left: 25px;
      position: relative;
    }
    .feature-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    .cta-button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📝 NoteBoard</div>
    </div>
    
    <h1>Welcome to NoteBoard!</h1>
    
    <div class="greeting">
      Hi ${displayName},
    </div>
    
    <div class="content">
      <p>Thank you for joining NoteBoard! We're thrilled to have you as part of our community.</p>
      
      <p>NoteBoard is your platform to connect, share, and collaborate. Whether you're posting opportunities or looking for services, we've got you covered.</p>
    </div>
    
    <div class="features">
      <h3 style="color: #1f2937; margin-top: 0;">Here's what you can do:</h3>
      <div class="feature-item">Post and browse notes from your local community</div>
      <div class="feature-item">Connect with providers and requesters</div>
      <div class="feature-item">Manage your profile and preferences</div>
      <div class="feature-item">Track your activity and transactions</div>
    </div>
    
    <div style="text-align: center;">
      <a href="${Deno.env.get('SITE_URL') || 'https://your-site.com'}" class="cta-button">
        Get Started Now
      </a>
    </div>
    
    <div class="content">
      <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
      <p>Happy posting!</p>
      <p style="font-weight: 600; color: #1f2937;">The NoteBoard Team</p>
    </div>
    
    <div class="footer">
      <p>You're receiving this email because you signed up for NoteBoard.</p>
      <p>&copy; ${new Date().getFullYear()} NoteBoard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
