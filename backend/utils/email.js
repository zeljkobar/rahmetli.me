import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Rahmetli.me" <noreply@rahmetli.me>',
      to,
      subject,
      html,
      text: text || stripHtml(html),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(email, username, verificationToken) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/verify-email?token=${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2c5f2d 0%, #1e4620 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2c5f2d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🕌 Rahmetli.me</h1>
          <p>Allahu yerhamhum</p>
        </div>
        <div class="content">
          <h2>Dobrodošli, ${username}!</h2>
          <p>Hvala što ste se registrovali na Rahmetli.me portal.</p>
          <p>Da biste aktivirali svoj nalog, molimo vas da potvrdite vašu email adresu klikom na dugme ispod:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Potvrdi Email</a>
          </div>
          <p>Ili kopirajte i zalijepite ovaj link u pretraživač:</p>
          <p style="word-break: break-all; color: #2c5f2d;">${verificationUrl}</p>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Ako niste napravili ovaj nalog, možete ignorisati ovaj email.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Rahmetli.me - Prvi portal za obavještenja o odlasku na ahiret</p>
          <p>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Potvrdite vašu email adresu - Rahmetli.me',
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, username, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2c5f2d 0%, #1e4620 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2c5f2d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🕌 Rahmetli.me</h1>
        </div>
        <div class="content">
          <h2>Reset lozinke</h2>
          <p>Poštovani ${username},</p>
          <p>Primili smo zahtjev za promjenu lozinke za vaš nalog.</p>
          <p>Kliknite na dugme ispod da resetujete lozinku:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Resetuj Lozinku</a>
          </div>
          <p>Ili kopirajte i zalijepite ovaj link u pretraživač:</p>
          <p style="word-break: break-all; color: #2c5f2d;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Napomena:</strong> Ovaj link je validan 1 sat. Ako ne želite promijeniti lozinku, jednostavno ignorišite ovaj email.
          </div>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Ako niste zahtijevali promjenu lozinke, molimo vas da kontaktirate podršku.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Rahmetli.me</p>
          <p>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset lozinke - Rahmetli.me',
    html,
  });
}

/**
 * Send new post notification to subscribers
 */
export async function sendNewPostNotification(subscriberEmail, post) {
  const postUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/objava/${post.id}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2c5f2d 0%, #1e4620 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .post-card { background: white; border-left: 4px solid #2c5f2d; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #2c5f2d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🕌 Rahmetli.me</h1>
          <p>Nova obavijest o odlasku na ahiret</p>
        </div>
        <div class="content">
          <h2>Nova objava u vašem gradu</h2>
          <p>Obavještavamo vas o novoj objavi:</p>
          <div class="post-card">
            <h3>${post.deceased_name}</h3>
            <p><strong>📍 Lokacija:</strong> ${post.location || 'N/A'}</p>
            <p><strong>📅 Datum:</strong> ${post.death_date || 'N/A'}</p>
            ${post.funeral_date ? `<p><strong>⏰ Dženaza:</strong> ${post.funeral_date}</p>` : ''}
          </div>
          <div style="text-align: center;">
            <a href="${postUrl}" class="button">Pogledaj objavu</a>
          </div>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Primili ste ovaj email jer ste pretplaćeni na notifikacije za grad ${post.location}.
            <br>Možete upravljati pretplatom u postavkama vašeg profila.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Rahmetli.me</p>
          <p>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: subscriberEmail,
    subject: `Nova objava - ${post.deceased_name} - ${post.location}`,
    html,
  });
}

/**
 * Send comment notification to post author
 */
export async function sendCommentNotification(authorEmail, comment, post) {
  const postUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/objava/${post.id}#komentar-${comment.id}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2c5f2d 0%, #1e4620 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .comment-card { background: white; border-left: 4px solid #2c5f2d; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #2c5f2d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🕌 Rahmetli.me</h1>
        </div>
        <div class="content">
          <h2>Novi komentar na vašoj objavi</h2>
          <p>Neko je ostavio saučešće na objavu "${post.deceased_name}":</p>
          <div class="comment-card">
            <p><strong>${comment.author_name}</strong></p>
            <p style="margin: 15px 0;">${comment.content}</p>
            <p style="font-size: 12px; color: #666;">${new Date(comment.created_at).toLocaleString('bs-BA')}</p>
          </div>
          <div style="text-align: center;">
            <a href="${postUrl}" class="button">Pogledaj komentar</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Rahmetli.me</p>
          <p>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: authorEmail,
    subject: `Novo saučešće - ${post.deceased_name}`,
    html,
  });
}

/**
 * Send admin notification for pending post
 */
export async function sendAdminPendingPostNotification(adminEmail, post) {
  const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/admin`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .post-card { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Admin Notifikacija</h1>
          <p>Rahmetli.me</p>
        </div>
        <div class="content">
          <h2>Nova objava na čekanju</h2>
          <p>Nova objava čeka vašu provjeru:</p>
          <div class="post-card">
            <h3>${post.deceased_name}</h3>
            <p><strong>Autor:</strong> ${post.author_username}</p>
            <p><strong>Lokacija:</strong> ${post.location || 'N/A'}</p>
            <p><strong>Datum:</strong> ${new Date(post.created_at).toLocaleString('bs-BA')}</p>
          </div>
          <div style="text-align: center;">
            <a href="${adminUrl}" class="button">Otvori Admin Panel</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Rahmetli.me Admin</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: adminEmail,
    subject: '🔔 Nova objava na čekanju - Rahmetli.me',
    html,
  });
}

/**
 * Send admin notification for pending comment
 */
export async function sendAdminPendingCommentNotification(adminEmail, comment, post) {
  const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/admin`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .comment-card { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Admin Notifikacija</h1>
          <p>Rahmetli.me</p>
        </div>
        <div class="content">
          <h2>Novi komentar na čekanju</h2>
          <p>Novi komentar čeka moderaciju:</p>
          <div class="comment-card">
            <p><strong>Na objavi:</strong> ${post.deceased_name}</p>
            <p><strong>Autor:</strong> ${comment.author_name}</p>
            <p style="margin: 15px 0;">${comment.content}</p>
            <p style="font-size: 12px; color: #666;">${new Date(comment.created_at).toLocaleString('bs-BA')}</p>
          </div>
          <div style="text-align: center;">
            <a href="${adminUrl}" class="button">Otvori Admin Panel</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Rahmetli.me Admin</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: adminEmail,
    subject: '🔔 Novi komentar na čekanju - Rahmetli.me',
    html,
  });
}

/**
 * Helper function to strip HTML tags from text
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNewPostNotification,
  sendCommentNotification,
  sendAdminPendingPostNotification,
  sendAdminPendingCommentNotification,
};
