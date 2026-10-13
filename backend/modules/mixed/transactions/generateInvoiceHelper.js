const path      = require("path");
const fs        = require("fs");
const puppeteer = require("puppeteer-core");

const PaymentTransaction = require("./model");
const SystemUser         = require("../../systemUsers.model");
const Counter            = require("../../../models/counter.model");
const InvoiceConfig      = require("../../admin/invoiceConfig/model");

const INVOICES_DIR  = "/var/www/storage/documents";
const BACKEND_URL   = process.env.BACKEND_URL || "http://localhost:5000";
const CHROME_PATH   = process.env.CHROME_PATH || "/usr/bin/google-chrome";

// Ensure invoices dir exists
if (!fs.existsSync(INVOICES_DIR)) fs.mkdirSync(INVOICES_DIR, { recursive: true });

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Round a number to 2 decimal places.
 */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Minimal Handlebars-style template renderer.
 * Supports: {{key}}, {{#if key}}...{{/if}}
 */
function renderTemplate(html, data) {
  // {{#if key}} ... {{/if}}
  html = html.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, inner) => {
    return data[key] ? inner : "";
  });
  // {{key}}
  html = html.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : "";
  });
  return html;
}

/**
 * Format a number as a readable Indian currency string, e.g. 1694.92 → "1,694.92"
 */
function fmt(n) {
  if (n == null) return "0.00";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Map reason enum to a human-readable invoice line item description.
 */
const REASON_DESCRIPTIONS = {
  ListingPlanPurchase:     "Listing Plan Purchase",
  ListingPlanUpgrade:      "Listing Plan Upgrade",
  RequirementPlanPurchase: "Requirement Plan Purchase",
  RequirementPlanUpgrade:  "Requirement Plan Upgrade",
  CoinsPurchase:           "Coins Purchase",
  Refund:                  "Refund",
  AdminCredit:             "Admin Credit",
  AdminDebit:              "Admin Debit",
};

// ── Main Function ───────────────────────────────────────────────────────────

/**
 * Generate a PDF invoice for a given payment transaction and save the URL
 * back onto the PaymentTransaction document.
 *
 * @param {string} transactionId  - MongoDB _id of the PaymentTransaction
 * @returns {Promise<string>}     - Public URL of the generated invoice PDF
 *
 * @example
 *   const url = await generateInvoice("6acca4e3175e924fa23abaa6");
 */
async function generateInvoice(transactionId) {
  // ── 1. Load transaction ──────────────────────────────────────────────────
  const txn = await PaymentTransaction.findById(transactionId).populate("refId", "name");
  if (!txn) throw new Error(`PaymentTransaction not found: ${transactionId}`);

  const profileFieldByRole = {
    Owner: "ownerProfile",
    Broker: "brokerProfile",
    Builder: "builderProfile",
  };
  const profileField = profileFieldByRole[txn.userType];
  const profile = profileField
    ? await SystemUser.findById(txn.user).select(`${profileField}.location ${profileField}.state`).lean()
    : null;
  const userProfile = profile?.[profileField];
  const locationName = userProfile?.location?.name?.trim();
  const state = userProfile?.state?.trim();
  const normalizedLocation = locationName?.toLocaleLowerCase("en-IN") || "";
  const normalizedState = state?.toLocaleLowerCase("en-IN") || "";
  const customerLocation = [locationName, locationName && state && !normalizedLocation.includes(normalizedState) ? state : null]
    .filter(Boolean)
    .join(", ");

  // ── 2. Load invoice config (singleton) ──────────────────────────────────
  const config = await InvoiceConfig.findOne().lean();

  // ── 3. Get next invoice number ───────────────────────────────────────────
  const invoiceNumber = await Counter.nextVal("invoice");

  // ── 4. Build tax values ──────────────────────────────────────────────────
  const tax      = txn.taxBreakdown || {};
  const baseAmt  = txn.baseAmount   ?? 0;
  const taxAmt   = tax.taxAmount    ?? 0;
  const cgst     = tax.cgst         ?? 0;
  const sgst     = tax.sgst         ?? 0;
  const igst     = tax.igst         ?? 0;

  // Compute per-slab amounts from baseAmount
  const cgstAmount = cgst ? round2(baseAmt * cgst / 100) : 0;
  const sgstAmount = sgst ? round2(baseAmt * sgst / 100) : 0;
  const igstAmount = igst ? round2(baseAmt * igst / 100) : 0;

  // ── 5. Build company logo absolute URL ───────────────────────────────────
  let companyLogo = "";
  if (config?.companyLogo) {
    // stored as "/storage/images/..." — prefix with BACKEND_URL
    companyLogo = config.companyLogo.startsWith("http")
      ? config.companyLogo
      : `${BACKEND_URL}${config.companyLogo}`;
  }

  // ── 6. Build template data ───────────────────────────────────────────────
  const now         = new Date();
  const invoiceDate = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const generatedAt = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const templateData = {
    invoiceNumber,
    companyLogo,
    companyName:      config?.companyName    || "RealSquare",
    companyAddress:   config?.companyAddress?.name || config?.companyAddress || "",
    companyEmail:     config?.companyEmail   || "",
    companyMobile:    config?.companyMobile  || "",
    customerName:     txn.userDetails?.name   || "—",
    customerMobile:   txn.userDetails?.mobile || "—",
    customerLocation,
    userType:         txn.userType            || "—",
    invoiceDate,
    razorpayOrderId:  txn.razorpayOrderId     || "—",
    razorpayPaymentId: txn.razorpayPaymentId  || "",
    status:           txn.status              || "—",
    itemDescription:  (() => {
      const PLAN_REASONS = new Set(["ListingPlanPurchase", "ListingPlanUpgrade", "RequirementPlanPurchase", "RequirementPlanUpgrade"]);
      const planName = txn.refId?.name || null;
      if (txn.reason === "CoinsPurchase")
        return `Coins Purchase (${txn.amount.toLocaleString("en-IN")} coins)`;
      if (PLAN_REASONS.has(txn.reason) && planName)
        return `${REASON_DESCRIPTIONS[txn.reason] || txn.reason} (${planName})`;
      return REASON_DESCRIPTIONS[txn.reason] || txn.reason;
    })(),
    quantity:         1,
    lineTotal:        fmt(1 * baseAmt),
    currency:         txn.currency === "INR" ? "₹" : txn.currency,
    amount:           fmt(txn.amount),
    baseAmount:       fmt(baseAmt),
    taxAmount:        fmt(taxAmt),
    cgst:             cgst  || 0,
    sgst:             sgst  || 0,
    igst:             igst  || 0,
    cgstAmount:       fmt(cgstAmount),
    sgstAmount:       fmt(sgstAmount),
    igstAmount:       fmt(igstAmount),
    generatedAt,
  };

  // ── 7. Render HTML ───────────────────────────────────────────────────────
  const templatePath = path.join(__dirname, "invoice.html");
  const rawHtml      = fs.readFileSync(templatePath, "utf8");
  const renderedHtml = renderTemplate(rawHtml, templateData);

  // ── 8. Launch Puppeteer and generate PDF ─────────────────────────────────
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  let pdfBuffer;
  try {
    const page = await browser.newPage();
    // The invoice only needs its HTML and inline styles. Waiting for network idle
    // can time out on the optional company logo or other external resources.
    await page.setContent(renderedHtml, { waitUntil: "domcontentloaded" });
    pdfBuffer = await page.pdf({
      format:               "A4",
      printBackground:      true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
  } finally {
    await browser.close();
  }

  // ── 9. Save PDF to disk ──────────────────────────────────────────────────
  const filename    = `invoice-${invoiceNumber}-${Date.now()}.pdf`;
  const filePath    = path.join(INVOICES_DIR, filename);
  fs.writeFileSync(filePath, pdfBuffer);

  const invoiceUrl     = `/storage/documents/${filename}`;
  const invoiceFullUrl = `${BACKEND_URL}${invoiceUrl}`;

  // ── 10. Persist invoiceNumber + invoiceUrl on the transaction ─────────────
  txn.invoiceNumber = invoiceNumber;
  txn.invoiceUrl    = invoiceFullUrl;
  await txn.save();

  return invoiceFullUrl;
}

module.exports = { generateInvoice };
