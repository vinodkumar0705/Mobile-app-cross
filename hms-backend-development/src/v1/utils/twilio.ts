console.log("[twilio.ts] loaded");

import twilio from "twilio";
import * as dotenv from "dotenv";
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const smsFrom = process.env.TWILIO_SMS_FROM!;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM!;

console.log("[DEBUG] whatsappFrom:", whatsappFrom);
console.log("[DEBUG] accountSid:", accountSid ? "✅ loaded" : "❌ missing");

const client = twilio(accountSid, authToken);

// ─────────────────────NORMALIZE PHONE NUMBER────────────────────
const normalizePhone = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-().]/g, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
    if (cleaned.length === 10) return `+91${cleaned}`;
    return `+${cleaned}`;
};

// ─────────────────────SEND SMS────────────────────

export const sendSMS = async (to: string, body: string): Promise<void> => {
    try {
        const normalized = normalizePhone(to);
        await client.messages.create({
            from: smsFrom,
            to: normalized,
            body: body,
        });
        console.log(`[SMS] Sent to ${normalized}`);
    } catch (error: any) {
        console.error(`[SMS] Failed to send to ${to}:`, error.message);
    }
};

// ───────────────────SEND WHATSAPP──────────────────────

export const sendWhatsApp = async (to: string, body: string): Promise<void> => {
    try {
        const normalized = normalizePhone(to);
        console.log(`[DEBUG] Raw: ${to} → Normalized: ${normalized}`);
        const message = await client.messages.create({
            from: whatsappFrom,
            to: `whatsapp:${normalized}`,
            body: body,
        });
        console.log("[DEBUG] Message:", message);
        console.log(`[WhatsApp] Sent to ${normalized}`);
    } catch (error: any) {
        console.error(`[WhatsApp] Failed to send to ${to}:`, error.message);
    }
};

// ─────────────────────SEND BOTH SMS + WHATSAPP────────────────────

export const sendNotification = async (to: string, body: string): Promise<void> => {
    // WhatsApp only
    // await sendWhatsApp(to, body);

    // for both sms and whatsapp

    console.log("whatsapp", { to, body });
    const res = await Promise.allSettled([
        // sendSMS(to, body),
        sendWhatsApp(to, body),
    ]);
    console.log("whatsapp", res);
};
