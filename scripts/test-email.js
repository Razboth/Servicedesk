const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfiguration() {
  console.log('🔧 Testing email configuration...\n');

  // Check if email configuration exists
  const config = {
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@banksulutgo.co.id'
  };

  console.log('📧 Email Configuration:');
  console.log(`   Host: ${config.host || '❌ Not configured'}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user || '❌ Not configured'}`);
  console.log(`   Pass: ${config.pass ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   From: ${config.from}`);
  console.log('');

  if (!config.host || !config.user || !config.pass) {
    console.error('❌ Email configuration is incomplete!');
    console.log('\nPlease set the following environment variables:');
    if (!config.host) console.log('   - EMAIL_SERVER_HOST');
    if (!config.port) console.log('   - EMAIL_SERVER_PORT');
    if (!config.user) console.log('   - EMAIL_SERVER_USER');
    if (!config.pass) console.log('   - EMAIL_SERVER_PASSWORD');
    return false;
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
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Ask user if they want to send a test email
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('📮 Would you like to send a test email? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.question('📧 Enter recipient email address: ', async (recipient) => {
          try {
            console.log(`\n📤 Sending test email to ${recipient}...`);

            const info = await transporter.sendMail({
              from: config.from,
              to: recipient,
              subject: 'Test Email - Bank SulutGo ServiceDesk',
              text: 'This is a test email from Bank SulutGo ServiceDesk system.',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Bank SulutGo ServiceDesk</h2>
                  <p>This is a test email to verify that the email notification system is working correctly.</p>
                  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                  <p style="color: #6b7280; font-size: 14px;">
                    Configuration Details:<br>
                    - SMTP Host: ${config.host}<br>
                    - Port: ${config.port}<br>
                    - From: ${config.from}
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                    This is an automated test email. Please do not reply.
                  </p>
                </div>
              `
            });

            console.log('✅ Test email sent successfully!');
            console.log(`   Message ID: ${info.messageId}`);
            console.log(`   Response: ${info.response}`);
          } catch (error) {
            console.error('❌ Failed to send test email:', error.message);
          }
          rl.close();
        });
      } else {
        console.log('✅ Email configuration verified (no test email sent)');
        rl.close();
      }
    });

  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.log('\nPossible issues:');
    console.log('   - Incorrect SMTP host or port');
    console.log('   - Invalid credentials');
    console.log('   - Firewall blocking the connection');
    console.log('   - SMTP server requires different security settings');
    return false;
  }
}

// Run the test
testEmailConfiguration();