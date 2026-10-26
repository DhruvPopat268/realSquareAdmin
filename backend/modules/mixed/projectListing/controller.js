const { validationResult } = require("express-validator");
const fs = require("fs/promises");
const ProjectListing = require("./model");
const PropertyCategory = require("../../admin/propertyCategories/model");
const IdealFor = require("../../admin/idealFor/model");
const AutoApprovalConfig = require("../../admin/autoApprovalConfig/model");
const FreeListingConfig = require("../../admin/freeListingManagement/model");
const ListingPurchasedPlan = require("../purchasedPlans/model");
const SystemUser = require("../../systemUsers.model");

const nowIST = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);
const toIST = (value) => new Date(new Date(value).getTime() + 5.5 * 60 * 60 * 1000);
const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const getActiveIdealFor = async (_req, res) => {
  try {
    const options = await IdealFor.find({ isActive: true }).select("name image order").sort({ order: 1, _id: 1 });
    return res.json({ success: true, data: options });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

async function findValidPlan(userId) {
  const plans = await ListingPurchasedPlan.find({ user: userId, status: "Active" });
  const now = nowIST();
  return plans.find((plan) => {
    const isUnlimited = plan.plan.numberOfPropertiesGiven === -1;
    if (!isUnlimited && plan.propertiesUsed >= plan.plan.numberOfPropertiesGiven) return false;
    if (plan.expiryDate === null || plan.expiryDate === undefined) return true;
    return toIST(plan.expiryDate) >= now;
  }) ?? null;
}

async function resolveStatus(user) {
  if (!user.autoApprovalProperties) return "UnderReview";
  const roleConfig = await AutoApprovalConfig.findOne({ roleId: user.role?._id ?? user.role });
  return roleConfig?.isActive ? "Active" : "UnderReview";
}

function normalizeResidentialConfigurations(body) {
  const configurations = body.residentialDetails?.configurations ?? body.residentialConfigurations;
  if (!Array.isArray(configurations)) return undefined;
  return {
    ...(body.residentialDetails ?? {}),
    areaUnit: body.residentialAreaUnit ?? body.residentialDetails?.areaUnit,
    configurations: configurations.map((item) => {
      if (typeof item === "string") return { bhk: item };
      const carpetArea = item.carpetArea;
      return {
        bhk: item.bhk,
        ...(carpetArea !== undefined && {
          carpetArea: Number(typeof carpetArea === "object" ? carpetArea.value : carpetArea),
        }),
      };
    }),
  };
}

function normalizeCommercialConfigurations(body) {
  const configurations = body.commercialDetails?.configurations ?? body.commercialConfigurations;
  if (!Array.isArray(configurations)) return undefined;
  return {
    ...(body.commercialDetails ?? {}),
    areaUnit: body.commercialAreaUnit ?? body.commercialDetails?.areaUnit,
    configurations: configurations.map((configuration) => {
      const carpetArea = configuration.carpetArea;
      return {
        carpetArea: Number(typeof carpetArea === "object" ? carpetArea.value : carpetArea),
      };
    }),
  };
}

const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const user = req.user;
    if (!(user.mobile && user.name && user.role)) {
      return res.status(403).json({
        success: false,
        message: "Please complete your profile before listing projects. You need to fill in your name and other required details.",
      });
    }

    const validPlan = await findValidPlan(user._id);
    if (!validPlan) {
      const [config, userDoc] = await Promise.all([
        FreeListingConfig.findOne().sort({ createdAt: -1 }),
        SystemUser.findById(user._id).select("freeListedProperties"),
      ]);
      const listingLimit = config?.noOfListings ?? 0;
      const alreadyListed = userDoc?.freeListedProperties ?? 0;
      if (listingLimit !== -1 && alreadyListed >= listingLimit) {
        return res.status(403).json({
          success: false,
          message: "You have no listing credits remaining. Please purchase a plan to list more properties.",
        });
      }
    }

    const idealForIds = Array.isArray(req.body.idealFor) ? req.body.idealFor : [];
    const [category, idealForOptions] = await Promise.all([
      PropertyCategory.findById(req.body.categoryId).select("name"),
      idealForIds.length
        ? IdealFor.find({ _id: { $in: idealForIds }, isActive: true }).sort({ order: 1, _id: 1 })
        : Promise.resolve([]),
    ]);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    if (idealForOptions.length !== idealForIds.length) {
      return res.status(400).json({ success: false, message: "One or more Ideal For options are no longer active" });
    }

    const listedBy = {
      id: user._id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      profilePhoto: user.profilePhoto,
      role: { id: user.role?._id, name: user.role?.name },
    };
    const status = await resolveStatus(user);
    const listing = new ProjectListing({
      category: { id: category._id, name: category.name },
      idealFor: idealForOptions.map((option) => ({
        id: option._id,
        name: option.name,
        image: option.image,
        order: option.order,
      })),
      cityName: req.body.cityName.trim(),
      locality: req.body.locality,
      projectName: req.body.projectName.trim(),
      developerName: req.body.developerName?.trim() || undefined,
      projectDescription: req.body.projectDescription,
      projectStatus: req.body.projectStatus,
      reraId: req.body.reraId ?? req.body.rera?.reraId,
      rera: req.body.rera || req.body.reraId
        ? { ...(req.body.rera ?? {}), reraId: req.body.rera?.reraId ?? req.body.reraId }
        : undefined,
      launchDate: req.body.launchDate,
      possessionDate: req.body.possessionDate,
      totalUnits: Number(req.body.totalUnits),
      availableUnits: Number(req.body.availableUnits),
      towerCount: req.body.towerCount === "" || req.body.towerCount == null ? undefined : Number(req.body.towerCount),
      residentialDetails: normalizeResidentialConfigurations(req.body),
      commercialDetails: normalizeCommercialConfigurations(req.body),
      furnishType: req.body.furnishType,
      furnishings: req.body.furnishings,
      amenities: req.body.amenities,
      minPrice: Number(req.body.minPrice),
      maxPrice: Number(req.body.maxPrice),
      listedBy,
      brochureUrl: req.body.brochureUrl,
      status,
    });

    await listing.save();

    if (validPlan) {
      if (validPlan.plan.numberOfPropertiesGiven !== -1) {
        validPlan.propertiesUsed += 1;
        if (validPlan.propertiesUsed >= validPlan.plan.numberOfPropertiesGiven) validPlan.status = "Consumed";
        await validPlan.save();
      }
    } else {
      await SystemUser.findByIdAndUpdate(user._id, { $inc: { freeListedProperties: 1 } });
    }

    return res.status(201).json({
      success: true,
      message: status === "Active" ? "Project listed successfully" : "Project is in under review",
      data: { _id: listing._id, status: listing.status, listedBy: listing.listedBy },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        errors: Object.entries(error.errors).map(([path, item]) => ({ path, msg: item.message })),
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const uploadMedia = async (req, res) => {
  const uploadedFiles = req.files ?? [];
  try {
    const listing = await ProjectListing.findById(req.body.projectId);
    if (!listing) {
      await Promise.all(uploadedFiles.map((file) => fs.unlink(file.path).catch(() => {})));
      return res.status(404).json({ success: false, message: "Project listing not found" });
    }

    if (String(listing.listedBy?.id) !== String(req.user._id)) {
      await Promise.all(uploadedFiles.map((file) => fs.unlink(file.path).catch(() => {})));
      return res.status(403).json({ success: false, message: "You can only upload media to your own project listings" });
    }
    if (!uploadedFiles.length) {
      return res.status(400).json({ success: false, message: "No images uploaded" });
    }

    listing.media = listing.media ?? {};
    listing.media.images = [...(listing.media.images ?? []), ...uploadedFiles.map((file) => toUrl(file.path))];
    await listing.save();
    return res.json({
      success: true,
      message: listing.status === "Active" ? "Project listed successfully" : "Project is in under review",
      data: { images: listing.media.images },
    });
  } catch (error) {
    await Promise.all(uploadedFiles.map((file) => fs.unlink(file.path).catch(() => {})));
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { create, uploadMedia, getActiveIdealFor };
