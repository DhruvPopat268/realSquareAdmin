const { body } = require("express-validator");

const createRoleValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required"),
  body("permissions")
    .optional()
    .isArray().withMessage("Permissions must be an array")
    .custom((arr) => {
      if (!arr.every((p) => typeof p === "string"))
        throw new Error("Each permission must be a string");
      return true;
    }),
];

const updateRoleValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty().withMessage("Name cannot be empty"),
  body("permissions")
    .optional()
    .isArray().withMessage("Permissions must be an array")
    .custom((arr) => {
      if (!arr.every((p) => typeof p === "string"))
        throw new Error("Each permission must be a string");
      return true;
    }),
  body("isActive")
    .optional()
    .isBoolean().withMessage("isActive must be a boolean"),
];

module.exports = { createRoleValidator, updateRoleValidator };
