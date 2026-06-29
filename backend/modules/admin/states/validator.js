const { body } = require("express-validator");

const createStateValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
];

const updateStateValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = { createStateValidator, updateStateValidator };
