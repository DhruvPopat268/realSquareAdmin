const { body } = require("express-validator");

const createCategoryValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").optional().trim(),
];

const updateCategoryValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("description").optional().trim(),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = { createCategoryValidator, updateCategoryValidator };
