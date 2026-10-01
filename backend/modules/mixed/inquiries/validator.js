const { body, validationResult } = require("express-validator");
const PropertyPurpose = require("../../admin/propertyPurposes/model");
const PropertyCategory = require("../../admin/propertyCategories/model");
const PropertyType = require("../../admin/propertyTypes/model");

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
    .isBoolean({ strict: true }).withMessage("isProperty must be a boolean")
    .bail()
    .custom((value) => {
      if (value !== true) throw new Error("Only individual property enquiries are supported");
      return true;
    }),

  // ── listingType ─────────────────────────────────────────────────────────────
  body("listingType")
    .notEmpty().withMessage("listingType is required")
    .isMongoId().withMessage("listingType must be a valid ID")
    .bail()
    .custom(async (id) => {
      const purpose = await PropertyPurpose.findOne({ _id: id, isActive: true }).select("_id").lean();
      if (!purpose) throw new Error("listingType must reference an existing active property purpose");
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

  // ── propertyType (optional) ─────────────────────────────────────────────────
  body("propertyType")
    .optional()
    .isMongoId().withMessage("propertyType must be a valid ID")
    .bail()
    .custom(async (id, { req }) => {
      const propertyType = await PropertyType.findOne({ _id: id, isActive: true }).select("_id propertyCategory").lean();
      if (!propertyType) throw new Error("propertyType must reference an existing active property type");
      if (req.body.propertyCategory && propertyType.propertyCategory.toString().toLowerCase() !== String(req.body.propertyCategory).toLowerCase()) {
        throw new Error("propertyType must belong to the selected propertyCategory");
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
    .notEmpty().withMessage("budget.min is required")
    .isFloat({ min: 0 }).withMessage("budget.min must be a positive number"),

  body("budget.max")
    .notEmpty().withMessage("budget.max is required")
    .isFloat({ min: 0 }).withMessage("budget.max must be a positive number")
    .custom((max, { req }) => {
      if (Number(max) <= Number(req.body.budget?.min))
        throw new Error("budget.max must be greater than budget.min");
      return true;
    }),

  // ── bhk (optional) ──────────────────────────────────────────────────────────
  body("bhk")
    .optional()
    .isInt({ min: 0 }).withMessage("bhk must be a non-negative integer"),

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
