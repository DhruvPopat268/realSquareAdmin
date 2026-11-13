const mongoose = require("mongoose");
const SystemUser = require("../../systemUsers.model");
const PropertyListing = require("../propertyListing/model");
const ProjectListing = require("../projectListing/model");
const { normalizeListingCard } = require("../propertyListing/controller");
const { formatBudgetRange } = require("../projectListing/controller");
const { groupConfigurations } = require("../../../utils/projectConfigurationGroups");
const { decryptProfileId, decryptQrToken } = require("../../../utils/generateQr");

const ROLE_FIELDS = {
  [process.env.OWNER_ROLE_ID]: "ownerProfile",
  [process.env.BROKER_ROLE_ID]: "brokerProfile",
  [process.env.BUILDER_ROLE_ID]: "builderProfile",
};

const getPublicProfile = async (req, res) => {
  const encryptedId = req.params.encryptedId;
  try {
    const userId = decryptProfileId(encryptedId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const user = await SystemUser.findOne({
      _id: userId,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    }).select("+profileEncryptedId").populate("role", "name").lean();

    const roleId = user?.role?._id?.toString();
    const profileField = roleId ? ROLE_FIELDS[roleId] : null;
    const details = profileField ? user?.[profileField] : null;
    if (!user || user.profileEncryptedId !== encryptedId || !profileField || !details || !user.name?.trim() || !user.mobile?.trim()) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const [properties, projects] = await Promise.all([
      PropertyListing.find({ "listedBy.id": user._id })
        .select("category listingType propertyType cityName locality media status residentialDetails plotDetails pgDetails commercialDetails sellInfo rentInfo perSqFtPrice perSqYdPrice perSqMtPrice")
        .sort({ createdAt: -1 }).lean(),
      ProjectListing.find({ "listedBy.id": user._id })
        .select("category projectName developerName cityName locality media status projectStatus totalUnits availableUnits residentialDetails commercialDetails minPrice maxPrice")
        .sort({ createdAt: -1 }).lean(),
    ]);

    const data = {
      name: user.name,
      mobile: user.mobile,
      email: user.email || "",
      profilePhoto: user.profilePhoto || "",
      role: user.role.name,
      roleKey: profileField.replace("Profile", ""),
      location: details.location?.name || "",
      state: details.state || "",
      properties: properties.map((listing) => {
        const card = normalizeListingCard(listing);
        const details = listing.residentialDetails || listing.commercialDetails || listing.plotDetails || listing.pgDetails || {};
        const area = details.carpetArea || details.plotArea || details.builtUpArea || listing.plotDetails?.plotArea;
        return {
          _id: listing._id,
          title: card.title,
          price: card.price,
          image: card.thumbnail || "",
          location: [listing.locality?.address, listing.cityName].filter(Boolean).join(", "),
          category: listing.category?.name || "",
          propertyType: listing.propertyType?.name || "",
          listingType: listing.listingType?.name || "",
          status: listing.status,
          bedrooms: details.bhk || null,
          area: area?.value ? `${Number(area.value).toLocaleString("en-IN")} ${area.unit || "sqft"}` : "",
        };
      }),
      projects: projects.map((project) => ({
        _id: project._id,
        name: project.projectName,
        developer: project.developerName || "",
        image: project.media?.images?.[0] || "",
        location: [project.locality?.address, project.cityName].filter(Boolean).join(", "),
        category: project.category?.name || "",
        projectStatus: project.projectStatus || "",
        status: project.status,
        totalUnits: project.totalUnits,
        availableUnits: project.availableUnits,
        budgetRange: formatBudgetRange(project.minPrice, project.maxPrice),
        configurations: (project.residentialDetails?.configurations || project.commercialDetails?.configurations || []).map((item) => item.bhk ? `${item.bhk} BHK` : item.carpetArea ? `${item.carpetArea} ${project.commercialDetails?.areaUnit || "sqft"}` : "").filter(Boolean),
      })),
    };

    if (profileField === "ownerProfile") {
      const business = details.businessDetails || {};
      data.businessDetails = {
        name: business.name || "",
        logo: business.logo || "",
        type: business.type || "",
        gstNumber: business.gstNumber || "",
        email: business.email || "",
        mobile: business.mobile || "",
        website: business.website || "",
      };
    } else if (profileField === "brokerProfile") {
      const rera = details.reraVerification || {};
      data.brokerDetails = {
        agencyName: details.agencyName || "",
        reraId: rera.reraId || "",
        reraVerified: Boolean(rera.verified),
        yearsOfExperience: details.yearsOfExperience ?? null,
        bio: details.bio || "",
      };
    } else {
      data.builderDetails = {
        gstNumber: details.gstNumber || "",
        cinNumber: details.cinNumber || "",
        foundedYear: details.foundedYear ?? null,
        totalProjectsDelivered: details.totalProjectsDelivered ?? null,
      };
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error.message || "";
    if (message.includes("PROFILE_QR_ENCRYPTION_KEY")) {
      return res.status(503).json({ success: false, message: "Public profile links are not configured" });
    }
    return res.status(404).json({ success: false, message: "Profile not found" });
  }
};

const getPublicListing = async ({ type, id, token, profileToken }) => {
  const model = type === "property" ? PropertyListing : ProjectListing;
  const tokenField = type === "property" ? "propertyEncryptedId" : "projectEncryptedId";
  const identity = profileToken ? decryptProfileId(profileToken) : decryptQrToken(token, type);
  if (profileToken) {
    const profile = await SystemUser.findOne({
      _id: identity,
      profileEncryptedId: profileToken,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    }).populate("role", "name").select("_id role").lean();
    const profileField = profile?.role?._id ? ROLE_FIELDS[profile.role._id.toString()] : null;
    if (!profile || !profileField) return null;
  }
  const query = profileToken
    ? { _id: id, "listedBy.id": identity }
    : { _id: identity, [tokenField]: token, status: "Active" };
  const listing = await model.findOne(query).select(`+${tokenField}`).lean();
  if (!listing) return null;
  delete listing[tokenField];
  delete listing.propertyQr;
  delete listing.projectQr;
  const listedBy = listing.listedBy || {};
  listing.listedBy = {
    name: listedBy.name || "",
    mobile: listedBy.mobile || "",
    email: listedBy.email || "",
    profilePhoto: listedBy.profilePhoto || "",
    role: listedBy.role?.name || "",
  };
  if (type === "property") {
    const normalized = normalizeListingCard(listing);
    return { ...listing, title: normalized.title, price: normalized.price };
  }
  return {
    ...listing,
    configurationGroups: groupConfigurations({
      residential: listing.residentialDetails?.configurations ?? [],
      commercial: listing.commercialDetails?.configurations ?? [],
    }),
    budgetRange: formatBudgetRange(listing.minPrice, listing.maxPrice),
    isListedByCurrentUser: false,
  };
};

const respondWithPublicListing = (type, fromProfile = false) => async (req, res) => {
  try {
    const listing = await getPublicListing({
      type,
      id: fromProfile ? req.params.listingId : undefined,
      token: fromProfile ? undefined : req.params.encryptedId,
      profileToken: fromProfile ? req.params.profileToken : undefined,
    });
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found or unavailable" });
    return res.json({ success: true, data: listing });
  } catch (error) {
    return res.status(404).json({ success: false, message: "Listing not found or unavailable" });
  }
};

const getPublicPropertyQrDetail = respondWithPublicListing("property");
const getPublicProjectQrDetail = respondWithPublicListing("project");
const getProfilePropertyDetail = respondWithPublicListing("property", true);
const getProfileProjectDetail = respondWithPublicListing("project", true);

module.exports = {
  getPublicProfile,
  getPublicPropertyQrDetail,
  getPublicProjectQrDetail,
  getProfilePropertyDetail,
  getProfileProjectDetail,
};
