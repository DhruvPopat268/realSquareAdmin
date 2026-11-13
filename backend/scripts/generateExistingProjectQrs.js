const path = require("path");
const fs = require("fs/promises");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const ProjectListing = require("../modules/mixed/projectListing/model");
const { IMAGES_DIR } = require("../utils/upload");
const { generateProjectQr } = require("../utils/generateQr");

const removePreviousQrFile = async (url) => {
  if (typeof url !== "string") return;
  try {
    const filename = path.basename(new URL(url).pathname);
    if (!/^project-qr-[a-f\d]{32}\.png$/i.test(filename)) return;
    const directory = path.resolve(IMAGES_DIR);
    const imagePath = path.resolve(directory, filename);
    if (path.dirname(imagePath) === directory) await fs.unlink(imagePath).catch(() => {});
  } catch { /* Ignore invalid old URLs. */ }
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
  await mongoose.connect(process.env.MONGO_URI);
  let generated = 0;
  let failed = 0;
  try {
    const cursor = ProjectListing.find({}).select("_id projectQr").cursor();
    for await (const listing of cursor) {
      try {
        const previousQr = listing.projectQr;
        const qrData = await generateProjectQr(listing);
        const result = await ProjectListing.updateOne({ _id: listing._id }, { $set: qrData });
        if (result.modifiedCount) await removePreviousQrFile(previousQr);
        generated += 1;
      } catch (error) {
        failed += 1;
        console.error(`[Project QR] Could not generate QR for ${listing._id}: ${error.message}`);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
  console.log(`Project QR backfill complete. Generated: ${generated}; failed: ${failed}.`);
  if (failed) process.exitCode = 1;
};

main().catch(async (error) => {
  console.error(`Project QR backfill failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
