const { body } = require("express-validator");

const createPropertyTypeValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("propertyCategory").notEmpty().withMessage("Property category is required").isMongoId().withMessage("Invalid property category ID"),
  body("description").optional().trim(),
];

const updatePropertyTypeValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("propertyCategory").optional().isMongoId().withMessage("Invalid property category ID"),
  body("description").optional().trim(),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = { createPropertyTypeValidator, updatePropertyTypeValidator };
