const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const PropertyPurpose = require("../../admin/propertyPurposes/model");
const PropertyCategory = require("../../admin/propertyCategories/model");
const PropertyType = require("../../admin/propertyTypes/model");
const IdealFor = require("../../admin/idealFor/model");

const isUnderConstructionInquiry = (body = {}) => body.isProperty === false;
const isUnderConstructionCommercial = (body = {}) => Boolean(
  isUnderConstructionInquiry(body) &&
  process.env.CATEGORY_COMMERCIAL_ID &&
  String(body.propertyCategory ?? "") === String(process.env.CATEGORY_COMMERCIAL_ID)
);

const isCoworkingInquiry = (body = {}) => Boolean(
  process.env.LISTING_TYPE_RENT_ID &&
  process.env.CATEGORY_COMMERCIAL_ID &&
  process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID &&
  String(body.listingType ?? "") === String(process.env.LISTING_TYPE_RENT_ID) &&
  String(body.propertyCategory ?? "") === String(process.env.CATEGORY_COMMERCIAL_ID) &&
  String(body.propertyType ?? "") === String(process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID)
);

// ── Reusable middleware to return first validation error ──────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors:  errors.array(),
    });
  }
  next();
};

// ── Create Inquiry Validator ──────────────────────────────────────────────────
const createInquiryValidator = [
  // ── isProperty ──────────────────────────────────────────────────────────────
  body("isProperty")
    .notEmpty().withMessage("isProperty is required")
    .isBoolean({ strict: true }).withMessage("isProperty must be a boolean"),

  // ── listingType ─────────────────────────────────────────────────────────────
  body("listingType")
    .notEmpty().withMessage("listingType is required")
    .isMongoId().withMessage("listingType must be a valid ID")
    .bail()
    .custom(async (id) => {
      const purpose = await PropertyPurpose.findOne({ _id: id, isActive: true }).select("_id").lean();
      if (!purpose) throw new Error("listingType must reference an existing active property purpose");
      return true;
    })
    .custom((id, { req }) => {
      if (isUnderConstructionInquiry(req.body) && String(id) !== String(process.env.LISTING_TYPE_SELL_ID ?? "")) {
        throw new Error("Under Construction requirements must use the Sell purpose");
      }
      return true;
    }),

  // ── propertyCategory (optional) ─────────────────────────────────────────────
  body("propertyCategory")
    .optional()
    .isMongoId().withMessage("propertyCategory must be a valid ID")
    .bail()
    .custom(async (id) => {
      const category = await PropertyCategory.findOne({ _id: id, isActive: true }).select("_id").lean();
      if (!category) throw new Error("propertyCategory must reference an existing active property category");
      return true;
    }),

  body("propertyCategory").custom((id, { req }) => {
    if (!isUnderConstructionInquiry(req.body)) return true;
    if (!id) throw new Error("propertyCategory is required for Under Construction requirements");
    const supported = [process.env.CATEGORY_RESIDENTIAL_ID, process.env.CATEGORY_COMMERCIAL_ID].filter(Boolean).map(String);
    if (!supported.includes(String(id))) throw new Error("Under Construction requirements must use Residential or Commercial category");
    return true;
  }),

  // ── propertyType (optional) ─────────────────────────────────────────────────
  body("propertyType")
    .optional()
    .isMongoId().withMessage("propertyType must be a valid ID")
    .bail()
    .custom(async (id, { req }) => {
      if (isUnderConstructionInquiry(req.body)) {
        throw new Error("propertyType must be omitted for Under Construction requirements");
      }
      const propertyType = await PropertyType.findOne({ _id: id, isActive: true }).select("_id propertyCategory").lean();
      if (!propertyType) throw new Error("propertyType must reference an existing active property type");
      if (process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID && String(id) === String(process.env.COMMERCIAL_PROPERTY_TYPE_co_working_space_ID)) {
        if (String(req.body.propertyCategory ?? "") !== String(process.env.CATEGORY_COMMERCIAL_ID ?? "")) {
          throw new Error("Co-working property type requires the Commercial category");
        }
        if (String(req.body.listingType ?? "") !== String(process.env.LISTING_TYPE_RENT_ID ?? "")) {
          throw new Error("Co-working property type requires the Rent purpose");
        }
      }
      if (req.body.propertyCategory && propertyType.propertyCategory.toString().toLowerCase() !== String(req.body.propertyCategory).toLowerCase()) {
        throw new Error("propertyType must belong to the selected propertyCategory");
      }
      return true;
    }),

  body("propertyType").custom((id, { req }) => {
    if (isUnderConstructionInquiry(req.body) && id !== undefined) {
      throw new Error("propertyType must be omitted for Under Construction requirements");
    }
    return true;
  }),

  // ── preferredCity ───────────────────────────────────────────────────────────
  body("preferredCity")
    .notEmpty().withMessage("preferredCity is required")
    .isString().withMessage("preferredCity must be a string")
    .trim(),

  // ── preferredArea (optional) ────────────────────────────────────────────────
  body("preferredArea")
    .optional()
    .isString().withMessage("preferredArea must be a string")
    .trim(),

  // ── budget ──────────────────────────────────────────────────────────────────
  body("budget.min")
    .if((_, { req }) => !isCoworkingInquiry(req.body))
    .notEmpty().withMessage("budget.min is required")
    .isFloat({ min: 0 }).withMessage("budget.min must be a positive number"),

  body("budget.max")
    .if((_, { req }) => !isCoworkingInquiry(req.body))
    .notEmpty().withMessage("budget.max is required")
    .isFloat({ min: 0 }).withMessage("budget.max must be a positive number")
    .custom((max, { req }) => {
      if (Number(max) <= Number(req.body.budget?.min))
        throw new Error("budget.max must be greater than budget.min");
      return true;
    }),

  // Co-working uses per-workspace rent ranges instead of a global budget.
  body("coworkingWorkspaces").custom((workspaces, { req }) => {
    const coworking = isCoworkingInquiry(req.body);
    if (!coworking) {
      if (workspaces !== undefined) throw new Error("coworkingWorkspaces is only allowed for Rent / Commercial / Co-working inquiries");
      return true;
    }

    if (req.body.budget !== undefined) throw new Error("budget must be omitted for co-working inquiries");
    if (!Array.isArray(workspaces) || workspaces.length < 1 || workspaces.length > 3) {
      throw new Error("coworkingWorkspaces must contain one to three workspace types");
    }

    const seenTypes = new Set();
    for (const [index, workspace] of workspaces.entries()) {
      if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) {
        throw new Error(`coworkingWorkspaces[${index}] must be an object`);
      }
      if (!["hall", "cabin", "virtualSpace"].includes(workspace.type)) {
        throw new Error(`coworkingWorkspaces[${index}].type must be hall, cabin, or virtualSpace`);
      }
      if (seenTypes.has(workspace.type)) throw new Error(`coworkingWorkspaces cannot contain duplicate ${workspace.type} entries`);
      seenTypes.add(workspace.type);

      const isVirtual = workspace.type === "virtualSpace";
      const minRent = Number(isVirtual ? workspace.minMonthlyRent : workspace.minRentPerSeat);
      const maxRent = Number(isVirtual ? workspace.maxMonthlyRent : workspace.maxRentPerSeat);
      if (!Number.isFinite(minRent) || minRent <= 0 || !Number.isFinite(maxRent) || maxRent <= 0 || maxRent < minRent) {
        throw new Error(`${workspace.type} must include a valid minimum and maximum rent, with maximum at least the minimum`);
      }

      if (isVirtual) {
        if (workspace.requiredSeats !== undefined || workspace.minRentPerSeat !== undefined || workspace.maxRentPerSeat !== undefined) {
          throw new Error("Virtual Space requirements use monthly rent and do not accept seat fields");
        }
      } else {
        const seats = Number(workspace.requiredSeats);
        if (!Number.isInteger(seats) || seats < 1) throw new Error(`${workspace.type} requiredSeats must be a positive whole number`);
        if (workspace.minMonthlyRent !== undefined || workspace.maxMonthlyRent !== undefined) {
          throw new Error(`${workspace.type} requirements use rent per seat and do not accept monthly total rent fields`);
        }
      }
    }
    return true;
  }),

  // ── bhk (optional) ──────────────────────────────────────────────────────────
  body("bhk")
    .optional()
    .isInt({ min: 0 }).withMessage("bhk must be a non-negative integer"),

  body("bhk").custom((value, { req }) => {
    if (!isUnderConstructionInquiry(req.body)) return true;
    if (String(req.body.propertyCategory ?? "") === String(process.env.CATEGORY_RESIDENTIAL_ID ?? "") && value === undefined) {
      throw new Error("bhk is required for Under Construction Residential requirements");
    }
    if (isUnderConstructionCommercial(req.body) && value !== undefined) {
      throw new Error("bhk is only allowed for Under Construction Residential requirements");
    }
    return true;
  }),

  body("carpetArea").custom((area, { req }) => {
    if (!isUnderConstructionCommercial(req.body)) {
      if (area !== undefined) throw new Error("carpetArea is only allowed for Under Construction Commercial requirements");
      return true;
    }
    if (!area || typeof area !== "object" || Array.isArray(area)) {
      throw new Error("carpetArea with value and unit is required for Under Construction Commercial requirements");
    }
    if (!Number.isFinite(Number(area.value)) || Number(area.value) <= 0) {
      throw new Error("carpetArea.value must be greater than zero");
    }
    if (!["sqft", "sqyd", "sqmt"].includes(area.unit)) {
      throw new Error("carpetArea.unit must be sqft, sqyd, or sqmt");
    }
    return true;
  }),

  body("idealFor").custom(async (options, { req }) => {
    if (!isUnderConstructionCommercial(req.body)) {
      if (options !== undefined) throw new Error("idealFor is only allowed for Under Construction Commercial requirements");
      return true;
    }
    if (!Array.isArray(options) || options.length !== 1) {
      throw new Error("idealFor must include exactly one configured option for Under Construction Commercial requirements");
    }
    if (options.some((id) => !mongoose.isValidObjectId(id))) {
      throw new Error("idealFor must contain valid option IDs");
    }
    if (new Set(options.map(String)).size !== options.length) {
      throw new Error("idealFor cannot contain duplicate options");
    }
    const activeCount = await IdealFor.countDocuments({ _id: { $in: options }, isActive: true });
    if (activeCount !== options.length) throw new Error("idealFor must reference active configured options");
    return true;
  }),

  body("builtUpArea").custom((area, { req }) => {
    if (isUnderConstructionInquiry(req.body) && area !== undefined) {
      throw new Error("builtUpArea is not used for Under Construction requirements; use carpetArea for Commercial");
    }
    return true;
  }),

  body("plotArea").custom((area, { req }) => {
    if (isUnderConstructionInquiry(req.body) && area !== undefined) {
      throw new Error("plotArea is not used for Under Construction requirements");
    }
    return true;
  }),

  // ── builtUpArea (optional) ──────────────────────────────────────────────────
  body("builtUpArea.value")
    .if(body("builtUpArea").exists())
    .notEmpty().withMessage("builtUpArea.value is required when builtUpArea is provided")
    .isFloat({ min: 0 }).withMessage("builtUpArea.value must be a positive number"),

  body("builtUpArea.unit")
    .if(body("builtUpArea").exists())
    .notEmpty().withMessage("builtUpArea.unit is required when builtUpArea is provided")
    .isIn(["sqft", "sqyd", "sqmt"]).withMessage("builtUpArea.unit must be sqft, sqyd, or sqmt"),

  // ── plotArea (optional) ─────────────────────────────────────────────────────
  body("plotArea.value")
    .if(body("plotArea").exists())
    .notEmpty().withMessage("plotArea.value is required when plotArea is provided")
    .isFloat({ min: 0 }).withMessage("plotArea.value must be a positive number"),

  body("plotArea.unit")
    .if(body("plotArea").exists())
    .notEmpty().withMessage("plotArea.unit is required when plotArea is provided")
    .isIn(["sqft", "sqyd", "sqmt"]).withMessage("plotArea.unit must be sqft, sqyd, or sqmt"),

  // ── furnishingType (optional — not required for plots or PG) ───────────────
  body("furnishingType")
    .optional()
    .isIn(["Unfurnished", "Semi-Furnished", "Fully-Furnished"]).withMessage("furnishingType must be Unfurnished, Semi-Furnished, or Fully-Furnished"),

  // ── inquiryClassification ───────────────────────────────────────────────────
  body("inquiryClassification")
    .notEmpty().withMessage("inquiryClassification is required")
    .isIn(["hot", "warm", "cold"]).withMessage("inquiryClassification must be hot, warm, or cold"),

  // ── lastFollowUpDate ────────────────────────────────────────────────────────
  body("lastFollowUpDate")
    .notEmpty().withMessage("lastFollowUpDate is required")
    .isISO8601().withMessage("lastFollowUpDate must be a valid date"),

  // ── remarks (optional) ──────────────────────────────────────────────────────
  body("remarks")
    .optional()
    .isString().withMessage("remarks must be a string")
    .trim(),

  // ── preferredCommunication ──────────────────────────────────────────────────
  body("preferredCommunication")
    .notEmpty().withMessage("preferredCommunication is required")
    .isArray({ min: 1 }).withMessage("preferredCommunication must have at least one option"),

  body("preferredCommunication.*")
    .isIn(["call", "whatsapp", "email", "sms"]).withMessage("Each preferredCommunication value must be call, whatsapp, email, or sms"),

  // ── Run validation ───────────────────────────────────────────────────────────
  validate,
];

module.exports = { createInquiryValidator };
