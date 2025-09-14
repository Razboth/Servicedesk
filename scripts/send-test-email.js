const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendTestEmail() {
  console.log('📧 Bank SulutGo ServiceDesk - Email Test\n');
  console.log('========================================\n');

  // Email configuration from environment
  const config = {
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
    from: process.env.EMAIL_SERVER_USER || process.env.EMAIL_FROM || 'noreply@banksulutgo.co.id' // Use USER email as FROM to avoid SendAsDenied
  };

  // Display configuration (masked password)
  console.log('📋 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   From: ${config.from}`);
  console.log(`   Pass: ${config.pass ? '****** (configured)' : '❌ Not configured'}`);
  console.log('');

  // Check configuration
  if (!config.host || !config.user || !config.pass) {
    console.error('❌ Email configuration is incomplete!');
    console.log('\nPlease ensure these environment variables are set:');
    if (!config.host) console.log('   - EMAIL_SERVER_HOST');
    if (!config.user) console.log('   - EMAIL_SERVER_USER');
    if (!config.pass) console.log('   - EMAIL_SERVER_PASSWORD');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    // Verify SMTP connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    // Prepare test email
    const testEmail = {
      from: `"Bank SulutGo ServiceDesk" <${config.from}>`,
      to: 'razboth14@gmail.com',
      subject: `Test Email - Bank SulutGo ServiceDesk [${new Date().toLocaleString()}]`,
      text: `This is a test email from Bank SulutGo ServiceDesk system.

Email notification system is working correctly.

Configuration Details:
- SMTP Host: ${config.host}
- Port: ${config.port}
- Sent from: ${config.from}
- Timestamp: ${new Date().toISOString()}

This is an automated test email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-align: center;">
                🏦 Bank SulutGo ServiceDesk
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; text-align: center; opacity: 0.9;">
                Email Notification Test
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
                ✅ Test Email Successful!
              </h2>

              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This test email confirms that the Bank SulutGo ServiceDesk email notification system is configured correctly and working as expected.
              </p>

              <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">
                  📊 Configuration Details
                </h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>SMTP Host:</strong></td>
                    <td style="padding: 5px 0; color: #333;">${config.host}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>Port:</strong></td>
                    <td style="padding: 5px 0; color: #333;">${config.port}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>From Address:</strong></td>
                    <td style="padding: 5px 0; color: #333;">${config.from}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>Recipient:</strong></td>
                    <td style="padding: 5px 0; color: #333;">razboth14@gmail.com</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #666;"><strong>Timestamp:</strong></td>
                    <td style="padding: 5px 0; color: #333;">${new Date().toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #e8f5e9; border-radius: 6px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 18px;">
                  🎉 What This Means
                </h3>
                <p style="color: #2e7d32; margin: 0; font-size: 14px; line-height: 1.6;">
                  Your ServiceDesk system can now send automated email notifications for:
                </p>
                <ul style="color: #2e7d32; margin: 10px 0 0 20px; font-size: 14px; line-height: 1.8;">
                  <li>New ticket creation</li>
                  <li>Ticket assignments to technicians</li>
                  <li>Status updates (resolved, closed)</li>
                  <li>New comments and communications</li>
                  <li>SLA warnings and breaches</li>
                  <li>Approval requests and completions</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 40px 0 20px 0;">
                <a href="http://localhost:3000" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-size: 16px; font-weight: bold;">
                  Visit ServiceDesk
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; margin: 0; font-size: 12px; text-align: center;">
                This is an automated test email from Bank SulutGo ServiceDesk.
              </p>
              <p style="color: #999; margin: 10px 0 0 0; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Bank SulutGo. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    };

    // Send the email
    console.log('📤 Sending test email to razboth14@gmail.com...');
    const info = await transporter.sendMail(testEmail);

    console.log('\n✅ SUCCESS! Test email sent successfully!\n');
    console.log('📬 Email Details:');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   Accepted: ${info.accepted.join(', ')}`);

    if (info.rejected && info.rejected.length > 0) {
      console.log(`   ⚠️  Rejected: ${info.rejected.join(', ')}`);
    }

    console.log('\n========================================');
    console.log('✨ Email system is working perfectly!');
    console.log('Check razboth14@gmail.com inbox for the test email.');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR: Failed to send test email\n');
    console.error('Error details:', error.message);

    if (error.code === 'EAUTH') {
      console.error('\n⚠️  Authentication failed. Please check:');
      console.error('   - EMAIL_SERVER_USER is correct');
      console.error('   - EMAIL_SERVER_PASSWORD is correct');
      console.error('   - Account allows SMTP access');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n⚠️  Connection failed. Please check:');
      console.error('   - EMAIL_SERVER_HOST is correct');
      console.error('   - EMAIL_SERVER_PORT is correct');
      console.error('   - Firewall/network allows connection');
    }

    process.exit(1);
  }
}

// Run the test
sendTestEmail();