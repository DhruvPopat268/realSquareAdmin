/**
 * WhatsApp Template Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Central place to define all WhatsApp message templates.
 *
 * Each template entry has:
 *   name            → exact template name as approved in Meta Business Manager
 *   language        → language code (en, en_US, hi, etc.)
 *   buildComponents → function that takes named variables and returns the
 *                     Meta API components array
 *
 * To add a new template:
 *   1. Create and get it approved in Meta Business Manager
 *   2. Add an entry here with the exact approved name
 *   3. Use it anywhere: sendWhatsApp(mobile, TEMPLATES.YOUR_KEY, { ...vars })
 */

const TEMPLATES = {
  // Templates will be added here once approved in Meta Business Manager
};

module.exports = { TEMPLATES };
