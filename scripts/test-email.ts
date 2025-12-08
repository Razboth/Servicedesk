import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testEmail() {
  console.log('📧 Testing Email Configuration...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('  EMAIL_SERVER_HOST:', process.env.EMAIL_SERVER_HOST || '❌ NOT SET');
  console.log('  EMAIL_SERVER_PORT:', process.env.EMAIL_SERVER_PORT || '❌ NOT SET');
  console.log('  EMAIL_SERVER_USER:', process.env.EMAIL_SERVER_USER || '❌ NOT SET');
  console.log('  EMAIL_SERVER_PASSWORD:', process.env.EMAIL_SERVER_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET');
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
  console.log('');

  if (!process.env.EMAIL_SERVER_HOST || !process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
    console.error('❌ Email configuration is incomplete. Please check your .env file.');
    process.exit(1);
  }

  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: true, // Enable debug output
    logger: true, // Log to console
  });

  console.log('🔌 Verifying SMTP connection...\n');

  try {
    await transporter.verify();
    console.log('\n✅ SMTP connection successful!\n');

    // Ask for test email
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`📤 Sending test email to: ${testEmail}\n`);

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
        to: testEmail,
        subject: 'Test Email - Bank SulutGo ServiceDesk',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test Email</h2>
            <p>This is a test email from Bank SulutGo ServiceDesk.</p>
            <p>If you received this email, your email configuration is working correctly.</p>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `,
        text: 'This is a test email from Bank SulutGo ServiceDesk. If you received this email, your email configuration is working correctly.',
      });

      console.log('✅ Test email sent successfully!');
      console.log('   Message ID:', info.messageId);
      console.log('   Response:', info.response);
    } else {
      console.log('💡 To send a test email, run:');
      console.log('   npx tsx scripts/test-email.ts your-email@example.com');
    }
  } catch (error) {
    console.error('\n❌ SMTP connection failed:', error);
    process.exit(1);
  }
}

testEmail();
