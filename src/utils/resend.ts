import { Resend } from "resend";
import config from "../app/config";

export const resend = new Resend(config.mail.resend_api_key);

export interface ISendEmailPayload {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | string[];
    text?: string;
}

/**
 * Send email via Resend API with response inspection and clear logging
 */
export const sendEmailWithResend = async (payload: ISendEmailPayload) => {
    const { to, subject, html, from, cc, bcc, replyTo, text } = payload;
    const recipient = Array.isArray(to) ? to.join(", ") : to;

    try {
        const result = await resend.emails.send({
            from: from || config.mail.from_email,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
            ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
            ...(replyTo && { reply_to: replyTo }),
            ...(text && { text }),
        });

        if (result.error) {
            console.error(`❌ [Resend API Error] Failed to send "${subject}" to ${recipient}:`, result.error);
            throw new Error(result.error.message);
        }

        console.log(`✉️ [Resend Success] Email sent to ${recipient}: "${subject}" (ID: ${result.data?.id})`);
        return result.data;
    } catch (error: any) {
        console.error(`❌ [Resend Email Error] Failed to send "${subject}" to ${recipient}:`, error?.message || error);
        throw error;
    }
};
