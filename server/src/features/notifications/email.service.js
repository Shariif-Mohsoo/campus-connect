import nodemailer from 'nodemailer';
import { config } from '../../shared/config/env.js';

class EmailService {
  /**
   * Initialize nodemailer transport using SMTP settings
   */
  getTransporter() {
    const { host, port, user, pass } = config.smtp;

    if (user && pass) {
      if (host.includes('gmail.com')) {
        return nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass }
        });
      } else {
        return nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false }
        });
      }
    }
    return null;
  }

  /**
   * Send Organizer Onboarding Credentials Email
   */
  async sendOrganizerCredentials({
    to,
    recipientName,
    rollNumber,
    department,
    category = 'Sports',
    username,
    password,
    loginLink = config.clientUrl || 'http://localhost:5173/'
  }) {
    const fromAddress = config.smtp.from;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #334155; color: #f8fafc;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">UniActivity Hub</h1>
          <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">University Extracurricular & ${category} Portal</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <h2 style="font-size: 18px; color: #ffffff; margin-top: 0;">Welcome, ${recipientName}!</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
            You have been officially authorized by the <strong>Head of Department (HOD)</strong> / Directorate of Student Affairs as an Activity Organizer for <strong>${category}</strong>.
          </p>

          <!-- Profile Snapshot -->
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px;">
            <div style="margin-bottom: 8px;"><strong style="color: #94a3b8;">Department:</strong> <span style="color: #38bdf8; font-weight: 600;">${department}</span></div>
            <div style="margin-bottom: 8px;"><strong style="color: #94a3b8;">Roll Number:</strong> <span style="color: #ffffff; font-family: monospace;">${rollNumber}</span></div>
            <div style="margin-bottom: 8px;"><strong style="color: #94a3b8;">Assigned Category:</strong> <span style="color: #fbbf24; font-weight: 700;">${category}</span></div>
            <div><strong style="color: #94a3b8;">Role:</strong> <span style="color: #34d399; font-weight: 600;">Authorized ${category} Organizer</span></div>
          </div>

          <!-- Credentials Box -->
          <div style="background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 12px; padding: 20px; margin: 24px 0;">
            <div style="font-size: 12px; text-transform: uppercase; color: #818cf8; font-weight: 800; letter-spacing: 0.04em; margin-bottom: 12px;">
              🔑 Your ${category} Portal Login Credentials
            </div>
            <div style="margin-bottom: 10px; font-size: 14px;">
              <span style="color: #94a3b8;">Username (Email):</span><br/>
              <strong style="color: #ffffff; font-size: 15px; font-family: monospace;">${username}</strong>
            </div>
            <div style="font-size: 14px;">
              <span style="color: #94a3b8;">Password:</span><br/>
              <strong style="color: #34d399; font-size: 16px; font-family: monospace; letter-spacing: 1px;">${password}</strong>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 32px 0 24px;">
            <a href="${loginLink}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);">
              Log in to ${category} Portal &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; text-align: center;">
            Portal Access URL: <a href="${loginLink}" style="color: #818cf8;">${loginLink}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #090d16; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b;">
          Directorate of Student Affairs &bull; UniActivity Hub Extracurricular Governance
        </div>
      </div>
    `;

    const textContent = `
Welcome to UniActivity Hub, ${recipientName}!

You have been authorized by the HOD / Directorate of Student Affairs as an Extracurricular Organizer.

Assigned Category: ${category}
Department: ${department}
Roll Number: ${rollNumber}

Your Login Credentials:
Username: ${username}
Password: ${password}
Login Portal: ${loginLink}

When you log in, you will be directed to your dedicated ${category} Portal.
Please keep your credentials secure.
    `;

    const transporter = this.getTransporter();

    // Attempt real SMTP dispatch if transporter is configured
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          subject: `Welcome to UniActivity Hub - ${category} Portal Access & Login Credentials`,
          text: textContent,
          html: htmlContent
        });
        console.log(`[Email Service] 🚀 Real email sent to ${to}! MessageId: ${info.messageId}`);
        return {
          delivered: true,
          status: 'Delivered to Real Inbox',
          messageId: info.messageId
        };
      } catch (err) {
        console.error(`[Email Service] ❌ Failed to dispatch email over SMTP to ${to}:`, err.message);
        return {
          delivered: false,
          status: `SMTP Error: ${err.message}`,
          error: err.message
        };
      }
    } else {
      console.log(`[Email Service] ℹ️ Stored in outbox for ${to} (Configure SMTP in server/.env for real delivery)`);
      return {
        delivered: false,
        status: 'Recorded in Portal Outbox (SMTP not configured)',
        notice: 'Configure SMTP_USER & SMTP_PASS in server/.env to send to real inboxes'
      };
    }
  }
}

export const emailService = new EmailService();
