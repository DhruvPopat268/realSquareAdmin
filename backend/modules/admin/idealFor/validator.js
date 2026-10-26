const { body } = require("express-validator");

const createIdealForValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body().custom((_, { req }) => {
    if (!req.file && !req.body.image) throw new Error("Image is required");
    return true;
  }),
];

const updateIdealForValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = { createIdealForValidator, updateIdealForValidator };
