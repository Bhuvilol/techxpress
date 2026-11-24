import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { logger } from './logger.js';

// Transactional email via Amazon SES (v2 API).
//
// Credentials come from the default AWS provider chain — on EC2 that's the
// instance role (no keys in env). Sending is enabled only when MAIL_FROM is
// set, e.g. "Vortex <noreply@your-domain>" on an SES-verified domain. Without
// it, mail is logged and skipped so local dev and pre-domain staging still work.
//
// Every helper resolves to { delivered: boolean, ... } and never throws, so a
// mail outage can't break the business action that triggered it.

const FROM = process.env.MAIL_FROM;
const REPLY_TO = process.env.MAIL_REPLY_TO;
const REGION = process.env.SES_REGION ?? 'ap-south-1';

const ses = FROM ? new SESv2Client({ region: REGION }) : null;

if (!ses) {
  const msg = 'mail.disabled — MAIL_FROM is not set; emails will be logged and skipped';
  if (process.env.NODE_ENV === 'production') logger.error(msg);
  else logger.warn(msg);
}

// User-supplied values (names, rejection reasons) must never be interpreted
// as HTML inside the email body.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

// heading/intro/footer are trusted template strings; callers escape any
// user-supplied parts before passing them in.
const wrapHtml = ({ heading, intro, body, footer }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Vortex</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121212;border:1px solid #1c1c1c;border-radius:4px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #1c1c1c;">
                <span style="font-size:14px;font-weight:800;letter-spacing:0.22em;color:#f5f5f5;">VORTEX</span>
                <span style="color:#666;margin:0 6px;">·</span>
                <span style="font-size:11px;letter-spacing:0.2em;color:#22d3ee;text-transform:uppercase;">Mission Control</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;font-weight:800;color:#f5f5f5;letter-spacing:-0.01em;">${heading}</h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#a3a3a3;">${intro}</p>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#666;">${footer}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;color:#404040;">You received this because you registered for the Vortex hackathon.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const credBlock = ({ email, password }) => `
  <div style="margin:16px 0 20px 0;padding:16px 18px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:4px;font-family:'Courier New',Courier,monospace;font-size:13px;color:#f5f5f5;">
    <div style="margin-bottom:8px;"><span style="color:#666;">Email&nbsp;&nbsp;&nbsp;&nbsp;</span> ${escapeHtml(email)}</div>
    <div><span style="color:#666;">Password</span> <span style="color:#22d3ee;font-weight:bold;">${escapeHtml(password)}</span></div>
  </div>
`;

export const sendMail = async ({ to, subject, text, html }) => {
  if (!ses) {
    logger.warn('mail.skipped — MAIL_FROM not set', { to, subject });
    return { delivered: false, reason: 'not-configured' };
  }
  try {
    const out = await ses.send(new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [to] },
      ...(REPLY_TO ? { ReplyToAddresses: [REPLY_TO] } : {}),
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
          },
        },
      },
    }));
    logger.info('mail.sent', { to, subject, id: out.MessageId });
    return { delivered: true, id: out.MessageId };
  } catch (err) {
    logger.error('mail.failed', { to, subject, err: `${err.name}: ${err.message}` });
    return { delivered: false, error: err.message };
  }
};

export const sendVerificationApprovedMail = ({ to, fullName, password }) =>
  sendMail({
    to,
    subject: 'Your Vortex account is verified',
    text:
      `Hi ${fullName},\n\n` +
      `Your registration has been verified.\n` +
      `Use the credentials below to log in:\n\n` +
      `  Email:    ${to}\n` +
      `  Password: ${password}\n\n` +
      `Keep this password safe — it is your only credential.\n` +
      `If you lose it, contact the organizers to reissue.\n`,
    html: wrapHtml({
      heading: `Welcome, ${escapeHtml(fullName)}.`,
      intro: 'Your registration has been verified. You can now log in to Vortex with the credentials below.',
      body: credBlock({ email: to, password }),
      footer: 'Keep this password safe — it is your only login credential. If you lose it, contact the organizers to reissue a new one.',
    }),
  });

export const sendVerificationRejectedMail = ({ to, fullName, reason }) =>
  sendMail({
    to,
    subject: 'Vortex registration update',
    text:
      `Hi ${fullName},\n\n` +
      `Your registration was not approved.\n` +
      (reason ? `Reason: ${reason}\n\n` : '\n') +
      `Reach out to the organizers if you believe this is an error.\n`,
    html: wrapHtml({
      heading: 'Registration not approved',
      intro: `Hi ${escapeHtml(fullName)}, your Vortex registration was not approved.`,
      body: reason
        ? `<div style="margin:8px 0 16px 0;padding:14px 16px;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:4px;font-size:13px;color:#f5f5f5;"><strong style="color:#fbbf24;">Reason:</strong> ${escapeHtml(reason)}</div>`
        : '',
      footer: 'Reach out to the organizers if you believe this is an error.',
    }),
  });

export const sendPasswordReissuedMail = ({ to, fullName, password }) =>
  sendMail({
    to,
    subject: 'Your new Vortex password',
    text:
      `Hi ${fullName},\n\n` +
      `An organizer issued you a new password for Vortex.\n\n` +
      `  Email:    ${to}\n` +
      `  Password: ${password}\n\n` +
      `Your previous password no longer works.\n`,
    html: wrapHtml({
      heading: 'New password issued',
      intro: `Hi ${escapeHtml(fullName)}, an organizer issued you a new password. Use the credentials below to log in.`,
      body: credBlock({ email: to, password }),
      footer: 'Your previous password no longer works — use this new one to log in.',
    }),
  });

export const sendAccessRevokedMail = ({ to, fullName }) =>
  sendMail({
    to,
    subject: 'Vortex access revoked',
    text:
      `Hi ${fullName},\n\n` +
      `Your access to Vortex has been revoked by an organizer.\n` +
      `Contact the team if you have questions.\n`,
    html: wrapHtml({
      heading: 'Access revoked',
      intro: `Hi ${escapeHtml(fullName)}, your Vortex access has been revoked by an organizer.`,
      body: '',
      footer: 'Contact the organizers if you have questions or believe this is in error.',
    }),
  });

export const sendAccessRestoredMail = ({ to, fullName, password }) =>
  sendMail({
    to,
    subject: 'Your Vortex access has been restored',
    text:
      `Hi ${fullName},\n\n` +
      `An organizer restored your access to Vortex.\n` +
      `Use the credentials below to log in again:\n\n` +
      `  Email:    ${to}\n` +
      `  Password: ${password}\n\n` +
      `Your previous revoked password no longer works.\n`,
    html: wrapHtml({
      heading: 'Access restored',
      intro: `Hi ${escapeHtml(fullName)}, an organizer restored your access. Use the credentials below to log back in.`,
      body: credBlock({ email: to, password }),
      footer: 'Your previous password no longer works — use this new one to log in.',
    }),
  });
