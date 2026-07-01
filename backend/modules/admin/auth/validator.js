const { body } = require("express-validator");

const registerValidator = [
  body("profile.name").trim().notEmpty().withMessage("Name is required"),
  body("profile.email").isEmail().withMessage("Valid email is required"),
  body("profile.password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least 1 uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least 1 number")
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage("Password must contain at least 1 symbol"),
];

const loginValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const forgotPasswordValidator = [
  body("otp").trim().notEmpty().withMessage("OTP is required"),
  body("newPassword")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least 1 uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least 1 number")
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage("Password must contain at least 1 symbol"),
];

const changePasswordValidator = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least 1 uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least 1 number")
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage("Password must contain at least 1 symbol"),
  body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
];

const updateUserValidator = [
  body("profile.name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("profile.email").optional().isEmail().withMessage("Valid email is required"),
  body("profile.phone").optional().trim(),
  body("role").optional().isMongoId().withMessage("Invalid role ID"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("isSuperAdmin").optional().isBoolean().withMessage("isSuperAdmin must be a boolean"),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  changePasswordValidator,
  updateUserValidator,
};
