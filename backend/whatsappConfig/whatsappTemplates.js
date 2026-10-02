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
  PROPERTY_INQUIRY_CONFIRMATION: {
    name: "property_inquiry_confirmation",
    language: "en_US",
    buildComponents: 
    ({
      createdByName,
      listingType,
      propertyCategory,
      propertyType,
      location,
      minimumBudget,
      maximumBudget,
      bhk,
      area,
      furnishingType,
      companyName,
      inquiryId,
    }) => {
      const values = [
        createdByName,
        listingType,
        propertyCategory,
        propertyType,
        location,
        minimumBudget,
        maximumBudget,
        bhk,
        area,
        furnishingType,
        companyName,
      ];
      const textParameter = (value) => ({
        type: "text",
        text: value == null || String(value).trim() === "" ? "NA" : String(value),
      });

      return [
        {
          type: "body",
          parameters: values.map(textParameter),
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [{ type: "payload", payload: `inquiry_confirm:${inquiryId}` }],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [{ type: "payload", payload: `inquiry_reject:${inquiryId}` }],
        },
      ];
    },
  },
};

module.exports = { TEMPLATES };
