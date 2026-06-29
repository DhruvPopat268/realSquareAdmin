const { body } = require("express-validator");

const createPurposeValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").optional().trim(),
];

const updatePurposeValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("description").optional().trim(),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = { createPurposeValidator, updatePurposeValidator };
