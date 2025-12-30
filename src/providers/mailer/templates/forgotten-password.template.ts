const forgottenPasswordHtmlContentEn = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset - TheWise</title>
  <style>
    html {
      -webkit-print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0E11 !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #EAECEF !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-container {
      width: 100%;
      padding: 40px 0;
    }
    .email-content {
      max-width: 600px;
      margin: 0 auto;
      background-color: #181A20;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      border: 1px solid #2B2F36;
    }
    .email-header {
      background-color: #181A20;
      text-align: center;
      padding: 40px 0 20px 0;
    }
    .email-header h1 {
        margin: 0;
        color: #F0B90B; /* Binance-like gold for trading feel */
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.5px;
    }
    .email-body {
      padding: 0 40px 40px 40px;
      text-align: center;
    }
    .email-body h2 {
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .email-body p {
      font-size: 15px;
      line-height: 1.6;
      color: #848E9C;
      margin: 0 0 24px 0;
    }
    .action-wrapper {
      margin: 32px 0;
    }
    .action-button {
      display: inline-block;
      background-color: #F0B90B;
      color: #fff;
      text-decoration: none;
      font-size: 16px;
      font-weight: 700;
      padding: 16px 32px;
      border-radius: 8px;
      transition: background-color 0.2s;
    }
    .divider {
      border-bottom: 1px solid #2B2F36;
      margin: 32px 0;
    }
    .security-note {
      font-size: 13px;
      color: #474D57;
      line-height: 1.5;
      text-align: left;
    }
    .email-footer {
      text-align: center;
      width: 100%;
      max-width: 600px;
      font-size: 12px;
      color: #474D57;
      padding: 20px 40px;
    }
    .email-footer p {
      margin: 0 0 8px 0;
    }
  </style>
</head>

<body>
  <table class="email-container" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td>
        <table class="email-content" cellpadding="0" cellspacing="0" align="center">
          <tr>
            <td class="email-header">
              <h1>THEWISE</h1>
            </td>
          </tr>
          
          <tr>
            <td class="email-body">
              <h2>Reset Your Password</h2>
              <p>Hi <strong>{{clientName}}</strong>,</p>
              <p>We received a request to reset the password for your TheWise account. Click the button below to choose a new password. This link is valid for 60 minutes.</p>

              <div class="action-wrapper">
                <a href="{{resetLink}}" class="action-button">Reset Password</a>
              </div>

              <p style="font-size: 12px;">If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 11px; color: #5E6673; word-break: break-all;">{{resetLink}}</p>

              <div class="divider"></div>

              <p class="security-note">
                <strong>Security Reminder:</strong> If you did not request this, please ignore this email. We recommend that you never share your account details or password reset links with anyone.
              </p>
            </td>
          </tr>
        </table>

        <table class="email-footer" cellpadding="0" cellspacing="0" align="center" width="100%">
          <tr>
            <td>
              <p>&copy; {{currentYear}} TheWise App. All rights reserved.</p>
              <p>Advanced Trading Insights & Signals</p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`

export const forgottenPasswordTemplate = {
    subject: {
        en: "Reset your TheWise password"
    },
    content: {
        en: forgottenPasswordHtmlContentEn
    }
}
