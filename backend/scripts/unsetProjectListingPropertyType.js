require("dotenv").config();
const mongoose = require("mongoose");
const ProjectListing = require("../modules/mixed/projectListing/model");

async function migrate() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);

  const filter = { propertyType: { $exists: true } };
  const count = await ProjectListing.collection.countDocuments(filter);
  if (process.argv.includes("--apply")) {
    const result = await ProjectListing.collection.updateMany(filter, { $unset: { propertyType: "" } });
    console.log(`Removed propertyType from ${result.modifiedCount} project listings.`);
  } else {
    console.log(`${count} project listings contain propertyType. Re-run with --apply to unset it.`);
  }
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
