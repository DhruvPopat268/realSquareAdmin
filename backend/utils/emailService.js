const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Load an HTML template and replace placeholders
 * @param {string} templatePath - absolute path to .html file
 * @param {Record<string, string>} variables - e.g. { OTP: "123456", NAME: "John" }
 */
const loadTemplate = (templatePath, variables = {}) => {
  let html = fs.readFileSync(templatePath, "utf-8");
  Object.entries(variables).forEach(([key, value]) => {
    html = html.replaceAll(`{{${key}}}`, value);
  });
  return html;
};

/**
 * Send an email
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.templatePath - path to HTML template file
 * @param {Record<string, string>} options.variables - template placeholder values
 */
const sendEmail = async ({ to, subject, templatePath, variables = {} }) => {
  const html = loadTemplate(templatePath, variables);

  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };
