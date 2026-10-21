const { body } = require("express-validator");

const benefits = (required) =>
  body("benefits").custom((value) => {
    if (value === undefined && !required) return true;

    if (
      !Array.isArray(value) ||
      value.length < 1 ||
      value.some((item) => typeof item !== "string" || !item.trim())
    ) {
      throw new Error("Benefits must contain non-empty strings");
    }

    const normalized = value.map((item) => item.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      throw new Error("Benefits cannot contain duplicates");
    }

    return true;
  });

const createVirtualSpaceValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  benefits(true),
  body("isActive").optional().isBoolean(),
];

const updateVirtualSpaceValidator = [
  body("title").optional().trim().notEmpty(),
  benefits(false),
  body("isActive").optional().isBoolean(),
];

module.exports = { createVirtualSpaceValidator, updateVirtualSpaceValidator };
