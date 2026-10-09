const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const IMAGES_DIR    = "/var/www/storage/images";
const VIDEOS_DIR    = "/var/www/storage/videos";
const DOCUMENTS_DIR = "/var/www/storage/documents";

// ensure dirs exist at startup
[IMAGES_DIR, VIDEOS_DIR, DOCUMENTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const getMaxFileSizeBytes = (envName, defaultMb) => {
  const configuredMb = Number(process.env[envName]);
  const maxFileSizeMb = Number.isFinite(configuredMb) && configuredMb > 0
    ? configuredMb
    : defaultMb;
  return maxFileSizeMb * 1024 * 1024;
};

const IMAGE_MAX_FILE_SIZE_BYTES = getMaxFileSizeBytes("IMAGE_MAX_FILE_SIZE_MB", 5);
const VIDEO_MAX_FILE_SIZE_BYTES = getMaxFileSizeBytes("VIDEO_MAX_FILE_SIZE_MB", 100);

const formatMaxFileSize = (maxFileSizeBytes) =>
  `${Number((maxFileSizeBytes / (1024 * 1024)).toFixed(2))} MB`;

const getUploadSizeErrorMessage = (fieldName) => {
  const isVideo = fieldName === "video" || fieldName === "reelVideo";
  const mediaType = isVideo ? "video" : "image";
  const maxFileSize = formatMaxFileSize(isVideo ? VIDEO_MAX_FILE_SIZE_BYTES : IMAGE_MAX_FILE_SIZE_BYTES);
  return `The ${mediaType} exceeds the maximum allowed size of ${maxFileSize}.`;
};

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const imageFilter = (req, file, cb) => {
  console.log("UPLOAD:", {
    name: file.originalname,
    mimetype: file.mimetype,
  });

  /^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only jpeg, png, webp images are allowed"), false);
};

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEOS_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const videoFilter = (_req, file, cb) => {
  /^video\/(mp4|webm|quicktime|x-m4v|x-matroska)$/.test(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only MP4, WebM, MOV, M4V, and MKV videos are allowed"), false);
};

const propertyMediaStorage = multer.diskStorage({
  destination: (_req, file, cb) => cb(null, file.fieldname === "images" ? IMAGES_DIR : VIDEOS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const propertyMediaFilter = (req, file, cb) => {
  if (file.fieldname === "images") return imageFilter(req, file, cb);
  if (file.fieldname === "video" || file.fieldname === "reelVideo") return videoFilter(req, file, cb);
  return cb(new Error("Unexpected media field"), false);
};

const uploadImage = multer({
  storage:  imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: IMAGE_MAX_FILE_SIZE_BYTES },
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: VIDEO_MAX_FILE_SIZE_BYTES },
});

const propertyMediaFields = multer({
  storage: propertyMediaStorage,
  fileFilter: propertyMediaFilter,
  limits: {
    fileSize: Math.max(IMAGE_MAX_FILE_SIZE_BYTES, VIDEO_MAX_FILE_SIZE_BYTES),
    files: 22,
    fields: 10,
    parts: 32,
  },
}).fields([
  { name: "images", maxCount: 20 },
  { name: "video", maxCount: 1 },
  { name: "reelVideo", maxCount: 1 },
]);

const removeUploadedFiles = async (files) => {
  await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
};

const handlePropertyMediaUpload = (req, res, next) => {
  propertyMediaFields(req, res, async (error) => {
    const files = Object.values(req.files ?? {}).flat();
    if (error) {
      await removeUploadedFiles(files);
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message = error.code === "LIMIT_FILE_SIZE"
        ? getUploadSizeErrorMessage(error.field)
        : error.message;
      return res.status(status).json({ success: false, message });
    }

    const oversizedImage = (req.files?.images ?? []).some((file) => file.size > IMAGE_MAX_FILE_SIZE_BYTES);
    const oversizedVideo = [...(req.files?.video ?? []), ...(req.files?.reelVideo ?? [])]
      .some((file) => file.size > VIDEO_MAX_FILE_SIZE_BYTES);
    if (oversizedImage || oversizedVideo) {
      await removeUploadedFiles(files);
      return res.status(413).json({
        success: false,
        message: getUploadSizeErrorMessage(oversizedImage ? "images" : "video"),
      });
    }

    next();
  });
};

module.exports = {
  uploadImage,
  uploadVideo,
  handlePropertyMediaUpload,
  getUploadSizeErrorMessage,
  IMAGES_DIR,
  VIDEOS_DIR,
  DOCUMENTS_DIR,
};
