/**
 * WhatsApp Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Wrapper around Meta's WhatsApp Business API for sending template messages.
 *
 * Usage:
 *   const { sendWhatsApp } = require("../whatsappConfig/whatsappService");
 *   const { TEMPLATES }    = require("../whatsappConfig/whatsappTemplates");
 *
 *   await sendWhatsApp("9157193754", TEMPLATES.INQUIRY_CREATED, {
 *     userName: "Dhruv",
 *     city:     "Ahmedabad",
 *   });
 *
 * Notes:
 *   - Mobile number must be in E.164 format → country code + number (no +)
 *     e.g. Indian number 9157193754 → "919157193754"
 *   - Errors are logged but NOT thrown — caller is never blocked
 */

const GRAPH_API_VERSION = "v26.0";
const GRAPH_API_BASE    = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const maskRecipient = (mobile) => {
  const digits = normalizeIndianMobile(mobile);
  return digits.length > 4 ? `${"*".repeat(digits.length - 4)}${digits.slice(-4)}` : "[invalid]";
};

/**
 * Normalize mobile to E.164 format for India (+91)
 * Strips leading 0 or +91 if present, then prepends 91
 */
const normalizeIndianMobile = (mobile) => {
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits; // fallback — return as-is
};

/**
 * Send a WhatsApp template message
 *
 * @param {string} mobile    - Recipient mobile number (10-digit Indian or E.164)
 * @param {object} template  - Template object from TEMPLATES registry
 * @param {object} variables - Named variables passed to template.buildComponents()
 * @returns {Promise<boolean>} true if sent successfully, false otherwise
 */
const sendWhatsApp = async (mobile, template, variables = {}) => {
  try {
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.error(`[WhatsApp] Cannot send template "${template?.name ?? "unknown"}": missing WhatsApp environment configuration`);
      return false;
    }

    const to         = normalizeIndianMobile(mobile);
    const components = template.buildComponents(variables);

    if (!to || to.length < 10) {
      console.error(`[WhatsApp] Cannot send template "${template.name}": recipient number is missing or invalid`);
      return false;
    }

    console.info(`[WhatsApp] Sending template "${template.name}" to ${maskRecipient(to)}`);

    const payload = {
      messaging_product: "whatsapp",
      recipient_type:    "individual",
      to,
      type:              "template",
      template: {
        name:       template.name,
        language:   { code: template.language },
        components,
      },
    };

    const res = await fetch(`${GRAPH_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error(`[WhatsApp] Template "${template.name}" failed for ${maskRecipient(to)} (HTTP ${res.status}):`, {
        code: json?.error?.code,
        type: json?.error?.type,
        message: json?.error?.message ?? "Unknown WhatsApp API error",
        fbtrace_id: json?.error?.fbtrace_id,
      });
      return false;
    }

    console.info(`[WhatsApp] Template "${template.name}" sent to ${maskRecipient(to)}`, {
      messageId: json?.messages?.[0]?.id ?? null,
    });
    return true;

  } catch (err) {
    console.error(`[WhatsApp] Exception sending template "${template?.name ?? "unknown"}" to ${maskRecipient(mobile)}`, {
      message: err.message,
    });
    return false;
  }
};

module.exports = { sendWhatsApp };
