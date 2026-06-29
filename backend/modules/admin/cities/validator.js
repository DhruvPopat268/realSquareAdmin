const { body } = require("express-validator");

const createCityValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("state").notEmpty().withMessage("State is required").isMongoId().withMessage("Invalid state ID"),
];

const updateCityValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("state").optional().isMongoId().withMessage("Invalid state ID"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = { createCityValidator, updateCityValidator };
