const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('✅ Nodemailer initialized with Gmail transport.');
} else {
  console.log('ℹ️ EMAIL_USER or EMAIL_PASS not set. Emails will be logged to console in test mode.');
}

const sendMail = async ({ to, subject, html, text }) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"Elderly Care Platform" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ''),
        html
      });
      console.log(`📧 [EMAIL SENT] to: ${to} | subject: "${subject}" | id: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [EMAIL ERROR] Failed sending to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`\n================== [MOCK EMAIL DISPATCH] ==================`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || html.replace(/<[^>]+>/g, '')}`);
    console.log(`===========================================================\n`);
    return { success: true, mock: true };
  }
};

module.exports = { sendMail };
