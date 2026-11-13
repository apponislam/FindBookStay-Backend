import { sendNodemailerMail } from "./nodemailer";
import { sendEmailWithResend } from "./resend";
import config from "../app/config";

/**
 * Dispatch mail via RESEND or Nodemailer based on environment config
 */
const sendMail = (to: string | string[], subject: string, html: string, from?: string) => {
    if (config.mail.driver === "RESEND") {
        sendEmailWithResend({ to, subject, html, from }).catch((error) => {
            console.error("Resend Email error:", error);
        });
    } else {
        sendNodemailerMail(to, subject, html, from);
    }
};

/**
 * Core HTML Email Wrapper Template
 * Designed for maximum email client compatibility (Gmail, Outlook, Apple Mail, Mobile)
 * matching FindBookStay's signature Deep Forest Green (#073B35) & Emerald (#10B981) design language.
 */
const renderBaseLayout = ({ preheader = "Notification from FindBookStay", title, bodyHtml, footerText = "This is an automated email from FindBookStay. Please do not reply directly." }: { preheader?: string; title: string; bodyHtml: string; footerText?: string }) => {
    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8faf9; font-family: 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <!-- Hidden Preheader -->
    <div style="display: none; font-size: 1px; color: #f8faf9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${preheader}
    </div>

    <!-- Outer Container -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8faf9; padding: 40px 15px;">
        <tr>
            <td align="center">
                <!-- Email Card Container -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2eae6; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(7,59,53,0.06);">
                    
                    <!-- Header Bar -->
                    <tr>
                        <td style="background-color: #073B35; padding: 24px 32px; text-align: center; border-bottom: 3px solid #10B981;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                                <tr>
                                    <td style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: 'Segoe UI', sans-serif; vertical-align: middle;">
                                        FindBook<span style="color: #10B981;">Stay</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Content Body -->
                    <tr>
                        <td style="padding: 36px 32px 30px 32px; color: #172b2a; font-size: 15px; line-height: 1.6;">
                            ${bodyHtml}
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding: 0 32px;">
                            <hr style="border: none; border-top: 1px solid #e2eae6; margin: 0;">
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px; background-color: #f8faf9; text-align: center; color: #64748b; font-size: 12px; line-height: 1.5;">
                            <p style="margin: 0 0 8px 0;">${footerText}</p>
                            <p style="margin: 0; font-weight: 600; color: #073B35;">
                                &copy; ${currentYear} FindBookStay Platform. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Helper to ensure links use full CLIENT_URL if a relative path is provided
 */
const formatClientUrl = (rawUrl: string): string => {
    if (!rawUrl) return config.client_url || "";
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        return rawUrl;
    }
    const baseUrl = config.client_url ? config.client_url.replace(/\/$/, "") : "";
    const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${baseUrl}${path}`;
};

/**
 * 1. Email Verification Template
 */
export const sendVerificationEmail = (email: string, name: string, verificationUrl: string, otp?: string) => {
    const title = "Verify Your Email Address";
    const fullUrl = formatClientUrl(verificationUrl);
    const bodyHtml = `
        <h2 style="color: #073B35; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">Hello ${name},</h2>
        <p style="margin-bottom: 24px; color: #64748b;">Thank you for registering on <strong>FindBookStay</strong>. Please verify your email address to get full access to verified home rentals, exclusive hotel stays, sports turfs, and direct property purchases.</p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
            <a href="${fullUrl}" target="_blank" style="background-color: #073B35; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(7, 59, 53, 0.25);">
                Verify Email Address
            </a>
        </div>

        ${
            otp
                ? `
        <!-- OTP Code Box -->
        <div style="background-color: #f0f5f3; border: 1px dashed #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
            <p style="margin: 0 0 8px 0; color: #073B35; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Or Enter 6-Digit Code In App</p>
            <div style="font-size: 32px; font-weight: 800; color: #073B35; letter-spacing: 6px;">${otp}</div>
            <p style="margin: 8px 0 0 0; color: #10B981; font-size: 12px;">This code expires in 10 minutes.</p>
        </div>
        `
                : ""
        }

        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${fullUrl}" style="color: #10B981; word-break: break-all;">${fullUrl}</a>
        </p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">This verification link expires in 24 hours.</p>
    `;

    const html = renderBaseLayout({ preheader: "Verify your email to start using FindBookStay", title, bodyHtml });
    sendMail(email, title, html);
};

/**
 * 2. OTP Code Email Template
 */
export const sendOtpEmail = (email: string, otp: string, name?: string) => {
    const title = "Your One-Time Password (OTP)";
    const recipientName = name ? `Hello ${name},` : "Hello,";
    const bodyHtml = `
        <h2 style="color: #073B35; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">${recipientName}</h2>
        <p style="margin-bottom: 20px; color: #64748b;">Use the 6-digit OTP code below to complete your authentication in <strong>FindBookStay</strong>:</p>
        
        <div style="background-color: #073B35; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
            <div style="font-size: 36px; font-weight: 800; color: #34D399; letter-spacing: 8px; font-family: monospace;">${otp}</div>
            <p style="margin: 10px 0 0 0; color: #A3B5AE; font-size: 12px;">Valid for the next 10 minutes</p>
        </div>

        <p style="font-size: 13px; color: #64748b; margin: 0;">
            If you did not request this code, please ignore this email or contact support if you suspect unauthorized activity.
        </p>
    `;

    const html = renderBaseLayout({ preheader: `Your OTP code is ${otp}`, title, bodyHtml });
    sendMail(email, title, html);
};

/**
 * 3. Welcome Email Template
 */
export const sendWelcomeEmail = (email: string, name: string) => {
    const title = "Welcome to FindBookStay!";
    const bodyHtml = `
        <h2 style="color: #073B35; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">Welcome, ${name}! 🎉</h2>
        <p style="margin-bottom: 16px; color: #64748b;">We're thrilled to have you join <strong>FindBookStay</strong> — your verified marketplace for home rentals, boutique hotel stays, sports turfs, and direct property purchases with 0% broker fees.</p>
        
        <div style="background-color: #f0f5f3; border-left: 4px solid #10B981; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
            <h4 style="margin: 0 0 8px 0; color: #073B35; font-size: 15px; font-weight: 700;">Explore our core verticals:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #172b2a; font-size: 14px; line-height: 1.6;">
                <li><strong>Rent:</strong> Family flats, apartments & bachelor seat rentals</li>
                <li><strong>Book:</strong> Boutique hotels, resorts & exclusive weekend stays</li>
                <li><strong>Sports:</strong> Hourly turfs, futsal & badminton court bookings</li>
                <li><strong>Buy:</strong> Verified properties & land directly from owners</li>
            </ul>
        </div>

        <p style="margin-top: 20px; color: #64748b;">If you ever need help or have questions, reach out to our team anytime.</p>
    `;

    const html = renderBaseLayout({ preheader: `Welcome to FindBookStay, ${name}!`, title, bodyHtml });
    sendMail(email, title, html);
};

/**
 * 4. Email Update Verification Template
 */
export const sendEmailUpdateVerification = (email: string, name: string, verificationUrl: string) => {
    const title = "Verify Your New Email Address";
    const fullUrl = formatClientUrl(verificationUrl);
    const bodyHtml = `
        <h2 style="color: #073B35; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">Hello ${name},</h2>
        <p style="margin-bottom: 24px; color: #64748b;">You recently requested to update your registered email address on <strong>FindBookStay</strong>. Please confirm this change by clicking below:</p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="${fullUrl}" target="_blank" style="background-color: #073B35; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(7, 59, 53, 0.25);">
                Confirm New Email
            </a>
        </div>

        <p style="font-size: 13px; color: #64748b;">
            If you did not request an email update, please change your password immediately or contact our support team.
        </p>
    `;

    const html = renderBaseLayout({ preheader: "Confirm your new email address for FindBookStay", title, bodyHtml });
    sendMail(email, title, html);
};

/**
 * 5. Password Reset Email Template
 */
export const sendPasswordResetEmail = (email: string, name: string, otp: string) => {
    const title = "Reset Your Password";
    const bodyHtml = `
        <h2 style="color: #073B35; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">Hello ${name},</h2>
        <p style="margin-bottom: 20px; color: #64748b;">We received a request to reset your password for your <strong>FindBookStay</strong> account. Use the 6-digit OTP code below in the app to set a new password:</p>
        
        <div style="background-color: #073B35; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
            <p style="margin: 0 0 8px 0; color: #A3B5AE; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Password Reset OTP Code</p>
            <div style="font-size: 36px; font-weight: 800; color: #34D399; letter-spacing: 8px; font-family: monospace;">${otp}</div>
            <p style="margin: 10px 0 0 0; color: #A3B5AE; font-size: 12px;">Valid for the next 10 minutes</p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">This code expires in 10 minutes. If you didn't request a password reset, please ignore this email or contact support.</p>
    `;

    const html = renderBaseLayout({ preheader: `Your password reset code is ${otp}`, title, bodyHtml });
    sendMail(email, title, html);
};

/**
 * 6. Admin Password Reset / Set Email Template
 */
export const sendAdminPasswordResetEmail = (email: string, name: string, passwordPlain: string) => {
    const title = "Your Account Password Has Been Reset";
    const bodyHtml = `
        <h2 style="color: #073B35; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">Hello ${name},</h2>
        <p style="margin-bottom: 20px; color: #64748b;">Your account password on <strong>FindBookStay</strong> has been reset by an administrator.</p>

        <div style="background-color: #f0f5f3; border-left: 4px solid #10B981; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 12px 0; color: #073B35; font-size: 14px; font-weight: 700;">Updated Login Credentials:</h4>
            <p style="margin: 6px 0; color: #172b2a; font-size: 14px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 6px 0; color: #172b2a; font-size: 14px;"><strong>New Password:</strong> <code style="background: #e2eae6; color: #073B35; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${passwordPlain}</code></p>
        </div>

        <p style="font-size: 13px; color: #64748b;">Please log in using these credentials and update your password in Settings for enhanced security.</p>
    `;

    const html = renderBaseLayout({ preheader: "Your account password has been updated by an admin", title, bodyHtml });
    sendMail(email, title, html);
};

/**
 * 7. Contact Support Response Email Template
 */
export const sendContactReplyEmail = (email: string, recipientName: string, subject: string, messageContent: string, replyMessage: string) => {
    const title = `Re: ${subject}`;
    const bodyHtml = `
        <h2 style="color: #073B35; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700;">Hello ${recipientName},</h2>
        <p style="margin-bottom: 16px; color: #64748b;">Thank you for contacting <strong>FindBookStay Support</strong> regarding: <strong>"${subject}"</strong>.</p>
        
        <!-- Original Message Quote -->
        <div style="background-color: #f8faf9; border-left: 3px solid #cbd5e1; padding: 12px 16px; margin: 16px 0; color: #64748b; font-style: italic; font-size: 14px;">
            "${messageContent}"
        </div>

        <!-- Official Support Reply Box -->
        <div style="background-color: #f0fdf4; border-left: 4px solid #10B981; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 10px 0; color: #073B35; font-weight: 700; font-size: 15px;">Support Team Response:</h4>
            <div style="color: #172b2a; font-size: 15px; line-height: 1.6;">
                ${replyMessage.replace(/\n/g, "<br/>")}
            </div>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">If you have further questions or need additional assistance, feel free to reply or submit another query.</p>
    `;

    const html = renderBaseLayout({ preheader: `Support response regarding "${subject}"`, title, bodyHtml });
    sendMail(email, title, html);
};
