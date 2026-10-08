const PROFILE_COMPLETION_CONFIGS = [
  {
    roleId: process.env.CUSTOMER_ROLE_ID,
    fields: [
      "name", "mobile", "email", "role",
      "customerProfile.location.name",
      "customerProfile.location.latitude",
      "customerProfile.location.longitude",
      "customerProfile.bio",
    ],
  },
  {
    roleId: process.env.OWNER_ROLE_ID,
    fields: [
      "name", "mobile", "email", "role",
      "ownerProfile.businessDetails.name",
      "ownerProfile.businessDetails.logo",
      "ownerProfile.businessDetails.type",
      "ownerProfile.businessDetails.gstNumber",
      "ownerProfile.businessDetails.mobile",
      "ownerProfile.businessDetails.website",
    ],
  },
  {
    roleId: process.env.BROKER_ROLE_ID,
    fields: [
      "name", "mobile", "email", "role",
      "brokerProfile.yearsOfExperience",
      "brokerProfile.agencyName",
      "brokerProfile.bio",
      "brokerProfile.reraVerification.reraId",
    ],
  },
  {
    roleId: process.env.BUILDER_ROLE_ID,
    fields: [
      "name", "mobile", "email", "role",
      "builderProfile.gstNumber",
      "builderProfile.cinNumber",
      "builderProfile.foundedYear",
      "builderProfile.totalProjectsDelivered",
      "builderProfile.location.name",
      "builderProfile.location.latitude",
      "builderProfile.location.longitude",
    ],
  },
].filter(({ roleId }) => Boolean(roleId));

function getNestedValue(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function hasProfileValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function calculateProfileCompletionPercentage(user, roleId) {
  if (!user) return 0;

  const resolvedRoleId = String(
    roleId ?? user.role?._id ?? user.role?.id ?? user.role ?? ""
  );
  const config = PROFILE_COMPLETION_CONFIGS.find(
    (item) => String(item.roleId) === resolvedRoleId
  );
  if (!config || config.fields.length === 0) return 0;

  const completedFields = config.fields.reduce(
    (count, field) => count + (hasProfileValue(getNestedValue(user, field)) ? 1 : 0),
    0
  );

  return Math.round((completedFields / config.fields.length) * 100);
}

module.exports = { calculateProfileCompletionPercentage };
