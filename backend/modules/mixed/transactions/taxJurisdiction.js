const GstConfig = require("../../admin/gstConfig/model");
const InvoiceConfig = require("../../admin/invoiceConfig/model");
const SystemUser = require("../../systemUsers.model");
const { resolveProfileLocation } = require("../../../utils/locationState");

const PROFILE_BY_TYPE = {
  Owner: "ownerProfile",
  Broker: "brokerProfile",
  Builder: "builderProfile",
};

const normalizeState = (state) => String(state || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN");

const makeTaxError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

async function resolveTaxJurisdiction(user, userType) {
  const profileField = PROFILE_BY_TYPE[userType];
  const profile = profileField && user?.[profileField];
  if (!profile?.location || !profile.state) {
    throw makeTaxError("Complete your profile location before making a payment.");
  }

  const verified = await resolveProfileLocation({ location: profile.location });
  if (normalizeState(profile.state) !== normalizeState(verified.state)) {
    throw makeTaxError("Your saved profile state does not match the selected location. Update your profile location before making a payment.");
  }

  const [invoiceConfig, gstConfig] = await Promise.all([
    InvoiceConfig.findOne().lean(),
    GstConfig.findOne().lean(),
  ]);
  if (!invoiceConfig?.companyState) {
    throw makeTaxError("Company state is missing from invoice configuration. Please contact support.", 503);
  }
  if (!gstConfig) {
    throw makeTaxError("GST rates are not configured. Please contact support.", 503);
  }

  const isIntraState = normalizeState(verified.state) === normalizeState(invoiceConfig.companyState);
  return {
    userState: verified.state,
    companyState: invoiceConfig.companyState,
    taxBreakdown: {
      cgst: isIntraState ? (gstConfig.cgst ?? 0) : 0,
      sgst: isIntraState ? (gstConfig.sgst ?? 0) : 0,
      igst: isIntraState ? 0 : (gstConfig.igst ?? 0),
    },
  };
}

async function resolveOrderTax(user, userType) {
  return resolveTaxJurisdiction(user, userType);
}

async function getTransactionTax(txn) {
  let jurisdiction = txn.taxState?.userState && txn.taxState?.companyState
    ? { userState: txn.taxState.userState, companyState: txn.taxState.companyState, taxBreakdown: txn.taxBreakdown || {} }
    : null;

  if (!jurisdiction) {
    const user = await SystemUser.findById(txn.user)
      .select("ownerProfile.location ownerProfile.state brokerProfile.location brokerProfile.state builderProfile.location builderProfile.state");
    if (!user) throw makeTaxError("Payment user was not found.", 404);
    jurisdiction = await resolveTaxJurisdiction(user, txn.userType);
    txn.taxState = { userState: jurisdiction.userState, companyState: jurisdiction.companyState };
  }

  const cgst = Number(jurisdiction.taxBreakdown.cgst) || 0;
  const sgst = Number(jurisdiction.taxBreakdown.sgst) || 0;
  const igst = Number(jurisdiction.taxBreakdown.igst) || 0;
  const rate = cgst + sgst + igst;
  const taxAmount = Number(((txn.amount * rate) / (100 + rate)).toFixed(2));
  return {
    baseAmount: Number((txn.amount - taxAmount).toFixed(2)),
    taxBreakdown: { cgst, sgst, igst, taxAmount },
  };
}

module.exports = { resolveOrderTax, getTransactionTax };
