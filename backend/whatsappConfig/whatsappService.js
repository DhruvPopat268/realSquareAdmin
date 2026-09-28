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

const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE    = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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
      console.error("[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in env");
      return false;
    }

    const to         = normalizeIndianMobile(mobile);
    const components = template.buildComponents(variables);

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
      console.error(`[WhatsApp] Failed to send template "${template.name}" to ${to}:`, json?.error ?? json);
      return false;
    }

    console.log(`[WhatsApp] Sent "${template.name}" to ${to} — message id: ${json?.messages?.[0]?.id}`);
    return true;

  } catch (err) {
    console.error(`[WhatsApp] Exception sending template "${template.name}" to ${mobile}:`, err.message);
    return false;
  }
};

module.exports = { sendWhatsApp };
