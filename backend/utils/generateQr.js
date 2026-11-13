const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const QRCode = require("qrcode");
const sharp = require("sharp");
const { IMAGES_DIR } = require("./upload");

const getEncryptionKey = () => {
  const value = process.env.PROFILE_QR_ENCRYPTION_KEY?.trim() || "";
  if (!/^[a-f\d]{64}$/i.test(value)) {
    throw new Error("PROFILE_QR_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(value, "hex");
};

const encryptProfileId = (id) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(id), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
};

const decryptProfileId = (token) => {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid profile QR token");
  const [, ivText, authTagText, encryptedText] = parts;
  const iv = Buffer.from(ivText, "base64url");
  const authTag = Buffer.from(authTagText, "base64url");
  const encrypted = Buffer.from(encryptedText, "base64url");
  if (iv.length !== 12 || authTag.length !== 16 || encrypted.length === 0) throw new Error("Invalid profile QR token");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const id = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  if (!/^[a-f\d]{24}$/i.test(id)) throw new Error("Invalid profile QR token");
  return id;
};

const normalizeColor = (value) => {
  let color = String(value || "").trim();
  if (/^#[a-f\d]{3}$/i.test(color)) {
    color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  if (!/^#[a-f\d]{6}$/i.test(color)) color = "#7B2FFF";

  const rgb = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
  const luminance = (channels) => {
    const [red, green, blue] = channels.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  // QR modules need strong contrast against the white background. Darken
  // bright brand colors while preserving their hue so scanners can read them.
  let factor = 1;
  while (1.05 / (luminance(rgb.map((channel) => Math.round(channel * factor))) + 0.05) < 4.5 && factor > 0.1) {
    factor -= 0.02;
  }
  return `#${rgb.map((channel) => Math.round(channel * factor).toString(16).padStart(2, "0")).join("")}`;
};

const getLogoBuffer = async () => {
  const logoUrl = process.env.COMPANY_LOGO_ICON_URL?.trim();
  if (!logoUrl) return null;
  try {
    const parsed = new URL(logoUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const response = await fetch(parsed, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const declaredLength = Number(response.headers.get("content-length"));
    if (declaredLength > 4 * 1024 * 1024) return null;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 4 * 1024 * 1024) return null;
    return await sharp(data).resize(140, 140, { fit: "contain", background: "white" }).png().toBuffer();
  } catch {
    return null;
  }
};

const generateQrImage = async (payload, filenamePrefix = "qr") => {
  const backendUrl = process.env.BACKEND_URL?.trim();
  if (!backendUrl) throw new Error("BACKEND_URL is not configured");
  const color = normalizeColor(process.env.CUSTOMER_PANEL_PRIMARY_COLOR);
  let qrBuffer = await QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 900,
    color: { dark: color, light: "#FFFFFF" },
  });

  const logo = await getLogoBuffer();
  if (logo) {
    const background = Buffer.from('<svg width="176" height="176"><circle cx="88" cy="88" r="86" fill="#ffffff" stroke="#ffffff" stroke-width="4"/></svg>');
    qrBuffer = await sharp(qrBuffer)
      .composite([
        { input: background, left: 362, top: 362 },
        { input: logo, left: 380, top: 380 },
      ])
      .png()
      .toBuffer();
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const safePrefix = String(filenamePrefix).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40) || "qr";
  const filename = `${safePrefix}-${crypto.randomBytes(16).toString("hex")}.png`;
  await fs.writeFile(path.join(IMAGES_DIR, filename), qrBuffer);
  return `${backendUrl.replace(/\/+$/, "")}/storage/images/${filename}`;
};

const generateProfileQr = async (user) => {
  if (!user?._id) throw new Error("A user ID is required to generate a profile QR");
  const customerPanelUrl = process.env.CUSTOMER_PANEL_URL?.trim();
  if (!customerPanelUrl) throw new Error("CUSTOMER_PANEL_URL is not configured");
  const parsedPanelUrl = new URL(customerPanelUrl);
  if (!["http:", "https:"].includes(parsedPanelUrl.protocol)) {
    throw new Error("CUSTOMER_PANEL_URL must use HTTP or HTTPS");
  }
  const profileEncryptedId = encryptProfileId(user._id);
  const targetUrl = `${customerPanelUrl.replace(/\/+$/, "")}/public-profile/${encodeURIComponent(profileEncryptedId)}`;
  const profileQr = await generateQrImage(targetUrl, "profile-qr");
  return { profileQr, profileEncryptedId };
};

module.exports = { encryptProfileId, decryptProfileId, generateQrImage, generateProfileQr };
