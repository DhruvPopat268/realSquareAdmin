require("dotenv").config();
const mongoose = require("mongoose");
const PropertyListing = require("../modules/mixed/propertyListing/model");
const { Inquiry } = require("../modules/mixed/inquiries/model");

const workspaceTypeMap = [
  ["hall", "dedicated_coworking_desk"],
  ["cabin", "individual_private_cabin"],
  ["virtualSpace", "virtual_office"],
];

async function migrate() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);

  const apply = process.argv.includes("--apply");
  let totalListings = 0;
  let totalInquiries = 0;

  for (const [oldType, newType] of workspaceTypeMap) {
    const listingFilter = { "commercialDetails.workspaces.type": oldType };
    const inquiryFilter = { "coworkingWorkspaces.type": oldType };
    const listingCount = await PropertyListing.collection.countDocuments(listingFilter);
    const inquiryCount = await Inquiry.collection.countDocuments(inquiryFilter);
    totalListings += listingCount;
    totalInquiries += inquiryCount;

    if (apply) {
      await PropertyListing.collection.updateMany(
        listingFilter,
        { $set: { "commercialDetails.workspaces.$[workspace].type": newType } },
        { arrayFilters: [{ "workspace.type": oldType }] },
      );
      await Inquiry.collection.updateMany(
        inquiryFilter,
        { $set: { "coworkingWorkspaces.$[workspace].type": newType } },
        { arrayFilters: [{ "workspace.type": oldType }] },
      );
    }
    console.log(`${oldType} -> ${newType}: ${listingCount} listings, ${inquiryCount} inquiries${apply ? " migrated" : " found"}.`);
  }

  if (!apply) console.log(`Dry run: ${totalListings} listing and ${totalInquiries} inquiry documents contain old workspace values. Re-run with --apply to migrate.`);
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
