const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const IMAGES_DIR    = "/var/www/storage/images";
const DOCUMENTS_DIR = "/var/www/storage/documents";

// ensure dirs exist at startup
[IMAGES_DIR, DOCUMENTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const imageFilter = (_req, file, cb) => {
  /^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only jpeg, png, webp images are allowed"), false);
};

const uploadImage = multer({
  storage:  imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = { uploadImage, IMAGES_DIR, DOCUMENTS_DIR };
