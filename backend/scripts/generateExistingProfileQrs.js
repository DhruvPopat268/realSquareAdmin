const path = require("path");
const fs = require("fs/promises");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const SystemUser = require("../modules/systemUsers.model");
const { IMAGES_DIR } = require("../utils/upload");
const { generateProfileQr } = require("../utils/generateQr");

const removePreviousQrFile = async (url) => {
  if (typeof url !== "string") return;
  try {
    const filename = path.basename(new URL(url).pathname);
    if (!/^profile-qr-[a-f\d]{32}\.png$/i.test(filename)) return;
    const imagesDir = path.resolve(IMAGES_DIR);
    const oldFile = path.resolve(imagesDir, filename);
    if (path.dirname(oldFile) === imagesDir) await fs.unlink(oldFile).catch(() => {});
  } catch {
    // Ignore old URLs that are not valid generated QR image links.
  }
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
  const eligibleRoleIds = [process.env.OWNER_ROLE_ID, process.env.BROKER_ROLE_ID, process.env.BUILDER_ROLE_ID]
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!eligibleRoleIds.length) throw new Error("No eligible profile role IDs are configured");

  await mongoose.connect(process.env.MONGO_URI);
  let updated = 0;
  let skipped = 0;
  try {
    const cursor = SystemUser.find({
      role: { $in: eligibleRoleIds },
      name: { $exists: true, $ne: "" },
      mobile: { $exists: true, $ne: "" },
      isDeleted: { $ne: true },
    }).select("_id name mobile role").cursor();

    for await (const user of cursor) {
      if (!user.name?.trim() || !user.mobile?.trim()) {
        skipped += 1;
        continue;
      }
      const qrData = await generateProfileQr(user);
      const updateResult = await SystemUser.updateOne({ _id: user._id }, {
        $set: qrData,
      });
      if (updateResult.modifiedCount > 0) await removePreviousQrFile(user.profileQr);
      updated += 1;
      console.log(`Generated profile QR for ${user._id}`);
    }
  } finally {
    await mongoose.disconnect();
  }
  console.log(`Profile QR backfill complete. Generated: ${updated}; skipped: ${skipped}.`);
};

main().catch(async (error) => {
  console.error(`Profile QR backfill failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
