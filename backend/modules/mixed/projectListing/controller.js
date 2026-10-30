const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const ProjectListing = require("./model");
const { compressGlb } = require("../../../utils/glbCompress");
const { calculateProjectCompletionPercentage } = require("./completionPercentage");
const PropertyCategory = require("../../admin/propertyCategories/model");
const IdealFor = require("../../admin/idealFor/model");
const FurnishingAmenity = require("../../admin/furnishingsAndAmenities/model");
const AutoApprovalConfig = require("../../admin/autoApprovalConfig/model");
const FreeListingConfig = require("../../admin/freeListingManagement/model");
const ListingPurchasedPlan = require("../purchasedPlans/model");
const SystemUser = require("../../systemUsers.model");
const { verifyCityAndLocality } = require("../../../utils/locationState");
const { groupConfigurations } = require("../../../utils/projectConfigurationGroups");
const { DOCUMENTS_DIR } = require("../../../utils/upload");

const nowIST = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);
const toIST = (value) => new Date(new Date(value).getTime() + 5.5 * 60 * 60 * 1000);
const toUrl = (filePath) =>
  `${process.env.BACKEND_URL}${filePath.replace("/var/www/storage", "/storage")}`;

const validateConfigurationOptions = (configurations, label) => {
  if (!Array.isArray(configurations)) return `Each ${label} configuration list must be an array.`;
  const validFurnishTypes = new Set(["Unfurnished", "Semi-Furnished", "Fully-Furnished"]);
  for (const [index, configuration] of configurations.entries()) {
    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
      return `${label} configuration ${index + 1} must be an object.`;
    }
    if (configuration.price !== undefined && configuration.price !== null && configuration.price !== ""
      && (!Number.isFinite(Number(configuration.price)) || Number(configuration.price) <= 0)) {
      return `Enter a price greater than zero for ${label} configuration ${index + 1}.`;
    }
    if (configuration.furnishingOptions === undefined) continue;
    if (!Array.isArray(configuration.furnishingOptions)) {
      return `Furnishing options for ${label} configuration ${index + 1} must be an array.`;
    }
    const selectedTypes = new Set();
    for (const option of configuration.furnishingOptions) {
      if (!validFurnishTypes.has(option)) {
        return `Choose a valid furnishing type for ${label} configuration ${index + 1}.`;
      }
      if (selectedTypes.has(option)) {
        return `A furnishing type can only be selected once for ${label} configuration ${index + 1}.`;
      }
      selectedTypes.add(option);
    }
  }
  return null;
};

const resolveStoredBrochurePath = (fileUrl) => {
  if (typeof fileUrl !== "string") return null;
  try {
    const pathname = decodeURIComponent(new URL(fileUrl, process.env.BACKEND_URL || "http://localhost").pathname);
    const prefix = "/storage/documents/";
    if (!pathname.startsWith(prefix)) return null;
    const filename = path.basename(pathname);
    if (!filename || filename !== pathname.slice(prefix.length)) return null;
    const resolved = path.resolve(DOCUMENTS_DIR, filename);
    return path.dirname(resolved) === path.resolve(DOCUMENTS_DIR) ? resolved : null;
  } catch {
    return null;
  }
};

const formatBudgetAmount = (amount) => {
  if (amount >= 10000000) return `₹${Number((amount / 10000000).toFixed(2))} Cr`;
  if (amount >= 100000) return `₹${Number((amount / 100000).toFixed(2))} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatBudgetRange = (minPrice, maxPrice) => {
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) return "Price on request";
  if (minPrice === maxPrice) return formatBudgetAmount(minPrice);
  return `${formatBudgetAmount(minPrice)} – ${formatBudgetAmount(maxPrice)}`;
};

const getActiveIdealFor = async (_req, res) => {
  try {
    const options = await IdealFor.find({ isActive: true }).select("name image order").sort({ order: 1, _id: 1 });
    return res.json({ success: true, data: options });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMyListings = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const filter = { "listedBy.id": req.user._id };
    const baseFilter = { "listedBy.id": req.user._id };

    if (req.query.categoryId) {
      if (!mongoose.isValidObjectId(req.query.categoryId)) {
        return res.status(400).json({ success: false, message: "Invalid categoryId" });
      }
      filter["category.id"] = new mongoose.Types.ObjectId(req.query.categoryId);
    }
    if (req.query.idealForId) {
      if (!mongoose.isValidObjectId(req.query.idealForId)) {
        return res.status(400).json({ success: false, message: "Invalid idealForId" });
      }
      filter["idealFor.id"] = new mongoose.Types.ObjectId(req.query.idealForId);
    }

    const [projectRecords, totalCount, statusCounts] = await Promise.all([
      ProjectListing.find(filter)
        .select("category projectName developerName projectDescription locality cityName projectStatus possessionDate rera.reraId launchDate idealFor minPrice maxPrice status residentialDetails commercialDetails totalUnits availableUnits towerCount furnishings amenities media createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProjectListing.countDocuments(filter),
      ProjectListing.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);
    const stats = { total: 0, Active: 0, Inactive: 0, UnderReview: 0, Rejected: 0, Sold: 0 };
    for (const { _id, count } of statusCounts) {
      const status = _id === "sold" ? "Sold" : _id;
      stats[status] = (stats[status] ?? 0) + count;
      stats.total += count;
    }
    const projects = projectRecords.map(({ minPrice, maxPrice, idealFor, ...project }) => ({
      ...project,
      idealFor: (idealFor ?? []).map(({ name }) => name),
      budgetRange: formatBudgetRange(minPrice, maxPrice),
      projectCompletionPercentage: calculateProjectCompletionPercentage({
        ...project,
        minPrice,
        maxPrice,
        idealFor,
      }),
    }));

    return res.json({
      success: true,
      data: {
        projects,
        stats,
        pagination: {
          page,
          limit,
          totalCount,
          hasMore: skip + projects.length < totalCount,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    }

    const project = await ProjectListing.findById(req.params.id).lean().select('-listedBy');
    if (!project) return res.status(404).json({ success: false, message: "Project listing not found" });

    return res.json({
      success: true,
      data: {
        ...project,
        configurationGroups: groupConfigurations({
          residential: project.residentialDetails?.configurations ?? [],
          commercial: project.commercialDetails?.configurations ?? [],
        }),
        budgetRange: formatBudgetRange(project.minPrice, project.maxPrice),
        isListedByCurrentUser: String(project.listedBy?.id ?? "") === String(req.user?._id ?? ""),
      },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Project listing not found" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProjectStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    }

    const listing = await ProjectListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: "Project listing not found" });
    if (String(listing.listedBy?.id ?? "") !== String(req.user?._id ?? "")) {
      return res.status(403).json({ success: false, message: "You are not allowed to update this listing" });
    }

    const transitions = {
      Active: ["Inactive", "Sold"],
      Inactive: ["Active"],
      Sold: ["Active"],
      sold: ["Active"], // Allow legacy lowercase records to be reactivated.
      UnderReview: [],
      Rejected: [],
    };
    const allowedStatuses = transitions[listing.status] ?? [];
    if (!allowedStatuses.includes(req.body?.status)) {
      return res.status(400).json({
        success: false,
        message: `Project cannot be changed from '${listing.status}' to '${req.body?.status ?? ""}'. Allowed status changes: ${allowedStatuses.join(", ") || "none"}.`,
      });
    }

    listing.status = req.body.status;
    await listing.save();
    return res.json({ success: true, message: "Project listing status updated", data: { status: listing.status } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const { projectListingId, ...changes } = req.body;
    if (!mongoose.isValidObjectId(projectListingId)) {
      return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    }
    const listing = await ProjectListing.findById(projectListingId);
    if (!listing) return res.status(404).json({ success: false, message: "Project listing not found" });
    if (String(listing.listedBy?.id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You can only update your own project listings" });
    }

    const previousCityName = listing.cityName ?? "";
    const previousLocality = listing.locality?.toObject?.() ?? listing.locality ?? {};

    const allowed = [
      "projectName", "developerName", "projectDescription", "projectStatus", "launchDate",
      "possessionDate", "totalUnits", "availableUnits", "towerCount", "cityName", "locality",
      "rera", "reraId", "residentialDetails", "commercialDetails", "furnishings",
      "amenities", "minPrice", "maxPrice", "idealFor",
    ];
    const unknownFields = Object.keys(changes).filter((key) => !allowed.includes(key));
    if (unknownFields.length) {
      return res.status(400).json({ success: false, message: `Unsupported project fields: ${unknownFields.join(", ")}` });
    }

    for (const key of ["projectName", "cityName"]) {
      if (changes[key] !== undefined) {
        if (typeof changes[key] !== "string" || !changes[key].trim()) {
          return res.status(400).json({ success: false, message: `${key} must be a non-empty string` });
        }
        listing[key] = changes[key].trim();
      }
    }
    if (changes.developerName !== undefined) listing.developerName = changes.developerName?.trim() || undefined;
    if (changes.locality !== undefined) {
      if (!changes.locality || typeof changes.locality !== "object" || Array.isArray(changes.locality)) {
        return res.status(400).json({ success: false, message: "locality must be an object" });
      }
      if (changes.locality.address !== undefined &&
          (typeof changes.locality.address !== "string" || !changes.locality.address.trim())) {
        return res.status(400).json({ success: false, message: "locality.address must be a non-empty string" });
      }
      for (const [coordinate, min, max] of [["latitude", -90, 90], ["longitude", -180, 180]]) {
        if (changes.locality[coordinate] !== undefined &&
            (typeof changes.locality[coordinate] !== "number" ||
              !Number.isFinite(changes.locality[coordinate]) ||
              changes.locality[coordinate] < min || changes.locality[coordinate] > max)) {
          return res.status(400).json({ success: false, message: `locality.${coordinate} must be a valid coordinate` });
        }
      }
      listing.locality = { ...(listing.locality?.toObject?.() ?? listing.locality ?? {}), ...changes.locality };
    }

    // ── Reverse-geocode city & locality verification ─────────────────────────
    const cityChanged = changes.cityName !== undefined && changes.cityName.trim() !== previousCityName;
    const localityChanged = changes.locality !== undefined && (
      (changes.locality.address !== undefined && changes.locality.address.trim() !== (previousLocality.address ?? "")) ||
      (changes.locality.latitude !== undefined && (previousLocality.latitude == null || changes.locality.latitude !== Number(previousLocality.latitude))) ||
      (changes.locality.longitude !== undefined && (previousLocality.longitude == null || changes.locality.longitude !== Number(previousLocality.longitude)))
    );

    if (cityChanged || localityChanged) {
      try {
        await verifyCityAndLocality(listing.cityName, listing.locality);
      } catch (verifyError) {
        return res.status(400).json({ success: false, message: verifyError.message });
      }
    }
    if (changes.reraId !== undefined) {
      listing.rera = { ...(listing.rera?.toObject?.() ?? listing.rera ?? {}), reraId: changes.reraId || undefined };
    }
    if (changes.rera !== undefined) listing.rera = { ...(listing.rera?.toObject?.() ?? listing.rera ?? {}), ...changes.rera };
    if (changes.idealFor !== undefined) {
      if (!Array.isArray(changes.idealFor)) return res.status(400).json({ success: false, message: "idealFor must be an array" });
      const ids = changes.idealFor.map((item) => typeof item === "string" ? item : item.id ?? item._id);
      const options = await IdealFor.find({ _id: { $in: ids }, isActive: true }).sort({ order: 1, _id: 1 });
      if (options.length !== ids.length) return res.status(400).json({ success: false, message: "One or more Ideal For options are no longer active" });
      listing.idealFor = options.map((option) => ({ id: option._id, name: option.name, image: option.image, order: option.order }));
    }

    for (const key of ["projectDescription", "projectStatus", "launchDate", "possessionDate", "totalUnits", "availableUnits", "towerCount", "minPrice", "maxPrice"]) {
      if (changes[key] !== undefined) listing[key] = changes[key] === "" ? undefined : changes[key];
    }
    for (const key of ["residentialDetails", "commercialDetails"]) {
      if (changes[key] !== undefined) {
        const incoming = { ...changes[key] };
        if (incoming.configurations !== undefined) {
          const configurationError = validateConfigurationOptions(incoming.configurations, key === "residentialDetails" ? "residential" : "commercial");
          if (configurationError) return res.status(400).json({ success: false, message: configurationError });
        }
        listing[key] = { ...(listing[key]?.toObject?.() ?? listing[key] ?? {}), ...incoming };
      }
    }

    if (changes.furnishings !== undefined || changes.amenities !== undefined) {
      const [furnishingOptions, amenityOptions] = await Promise.all([
        changes.furnishings !== undefined
          ? FurnishingAmenity.find({ _id: { $in: changes.furnishings.map((item) => item.furnishingId ?? item.id) } }).select("name icon")
          : Promise.resolve(null),
        changes.amenities !== undefined
          ? FurnishingAmenity.find({ _id: { $in: changes.amenities.map((item) => item.amenityId ?? item.id) } }).select("name icon")
          : Promise.resolve(null),
      ]);
      const mapItems = (items, options, idKey) => {
        if (!options) return items;
        const byId = new Map(options.map((option) => [String(option._id), option]));
        return items.map((item) => {
          const id = item[idKey] ?? item.id;
          const option = byId.get(String(id));
          if (!option) throw new Error("One or more selected furnishings or amenities are invalid");
          return { id, name: option.name, icon: option.icon, ...(item.count !== undefined && { count: item.count }) };
        });
      };
      try {
        if (changes.furnishings !== undefined) listing.furnishings = mapItems(changes.furnishings, furnishingOptions, "furnishingId");
        if (changes.amenities !== undefined) listing.amenities = mapItems(changes.amenities, amenityOptions, "amenityId");
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
    }

    const effectiveTotal = Number(listing.totalUnits);
    const effectiveAvailable = Number(listing.availableUnits);
    if (!Number.isInteger(effectiveTotal) || effectiveTotal < 1 || !Number.isInteger(effectiveAvailable) || effectiveAvailable < 1 || effectiveAvailable > effectiveTotal) {
      return res.status(400).json({ success: false, message: `Available units must be a whole number from 1 to ${effectiveTotal}.` });
    }
    if (listing.projectStatus !== "Ready to Move" && !listing.possessionDate) {
      return res.status(400).json({ success: false, message: "Possession date is required unless the project is Ready to Move." });
    }
    if (!Number.isFinite(Number(listing.minPrice)) || Number(listing.minPrice) <= 0 || !Number.isFinite(Number(listing.maxPrice)) || Number(listing.maxPrice) < Number(listing.minPrice)) {
      return res.status(400).json({ success: false, message: "Enter a valid project price range." });
    }
    const categoryName = listing.category?.name?.toLowerCase();
    const isCommercial = categoryName === "commercial";
    const configs = isCommercial
      ? listing.commercialDetails?.configurations ?? []
      : listing.residentialDetails?.configurations ?? [];
    if (!configs.length) return res.status(400).json({ success: false, message: "At least one project configuration is required." });

    if (categoryName === "residential") {
      const allowedBhk = new Set(["1 RK", ...Array.from({ length: 12 }, (_, index) => `${index + 1} BHK`)]);
      if (configs.some((item) => !item || typeof item.bhk !== "string" || !allowedBhk.has(item.bhk.trim()))) {
        return res.status(400).json({ success: false, message: "Each residential configuration must include a valid BHK option (1 RK or 1–12 BHK)." });
      }
    }

    if (isCommercial && configs.some((item) => !item || !Number.isFinite(Number(item.carpetArea)) || Number(item.carpetArea) <= 0)) {
      return res.status(400).json({ success: false, message: "Each commercial configuration must have a carpet area greater than zero." });
    }
    if (categoryName === "residential" && configs.some((item) => item?.carpetArea != null && (!Number.isFinite(Number(item.carpetArea)) || Number(item.carpetArea) <= 0))) {
      return res.status(400).json({ success: false, message: "A residential carpet area must be greater than zero when provided." });
    }

    listing.status = await resolveStatus(req.user);
    await listing.save();
    return res.json({ success: true, message: listing.status === "Active" ? "Project updated successfully" : "Project updated and sent for review", data: { _id: listing._id, status: listing.status } });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
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

const updateMedia = async (req, res) => {
  const uploadedFiles = Object.values(req.files ?? {}).flat();
  const removeUploads = async () => Promise.all(uploadedFiles.map((file) => fs.unlink(file.path).catch(() => {})));
  try {
    const id = req.body.projectListingId;
    if (!mongoose.isValidObjectId(id)) {
      await removeUploads();
      return res.status(400).json({ success: false, message: "Invalid project listing ID" });
    }
    const listing = await ProjectListing.findById(id);
    if (!listing) {
      await removeUploads();
      return res.status(404).json({ success: false, message: "Project listing not found" });
    }
    if (String(listing.listedBy?.id) !== String(req.user._id)) {
      await removeUploads();
      return res.status(403).json({ success: false, message: "You can only update media on your own project listings" });
    }

    const currentImages = listing.media?.images ?? [];
    let nextImages = currentImages;
    if (req.body.existingImages !== undefined || req.files?.images?.length) {
      let retained;
      try { retained = req.body.existingImages === undefined ? currentImages : JSON.parse(req.body.existingImages); }
      catch {
        await removeUploads();
        return res.status(400).json({ success: false, message: "existingImages must be a valid JSON array" });
      }
      if (!Array.isArray(retained)) {
        await removeUploads();
        return res.status(400).json({ success: false, message: "existingImages must be an array" });
      }
      const newImages = (req.files?.images ?? []).map((file) => toUrl(file.path));
      let isPrimary = false;
      if (req.body.isPrimary !== undefined) {
        try { isPrimary = JSON.parse(req.body.isPrimary)[0] === true; }
        catch {
          await removeUploads();
          return res.status(400).json({ success: false, message: "isPrimary must be a valid JSON array" });
        }
      }
      nextImages = isPrimary ? [...newImages, ...retained] : [...retained, ...newImages];
    }

    const configurationImageFiles = req.files?.configurationMedia ?? [];
    if (configurationImageFiles.length > 0 || req.body.configurationImageMap !== undefined) {
      let imageMap;
      try { imageMap = JSON.parse(req.body.configurationImageMap ?? "[]"); }
      catch {
        await removeUploads();
        return res.status(400).json({ success: false, message: "configurationImageMap must be a valid JSON array" });
      }
      if (!Array.isArray(imageMap) || imageMap.length !== configurationImageFiles.length) {
        await removeUploads();
        return res.status(400).json({ success: false, message: "configurationImageMap must describe every uploaded configuration image" });
      }
      const seenSlots = new Set();
      for (const [fileIndex, target] of imageMap.entries()) {
        const section = target?.section;
        const index = Number(target?.index);
        const field = target?.slot;
        const isSupportedSection = section === "residentialDetails" || section === "commercialDetails";
        const isSupportedField = field === "image2DUrl" || field === "model3DUrl";
        const configurations = isSupportedSection ? listing[section]?.configurations : null;
        const slotKey = `${section}:${index}:${field}`;
        if (!isSupportedSection || !isSupportedField || !Number.isInteger(index) || index < 0 || !configurations?.[index] || seenSlots.has(slotKey)) {
          await removeUploads();
          return res.status(400).json({ success: false, message: "A configuration image target is invalid" });
        }
        const uploadedFile = configurationImageFiles[fileIndex];
        const isModel = field === "model3DUrl";
        const modelExtension = path.extname(uploadedFile.originalname).toLowerCase();
        const isSupportedModelExtension = [".glb", ".gltf"].includes(modelExtension);
        if ((isModel && !isSupportedModelExtension) || (!isModel && !/^image\/(jpeg|jpg|png|webp)$/.test(uploadedFile.mimetype))) {
          await removeUploads();
          return res.status(400).json({ success: false, message: isModel ? "3D configuration models must be GLB or self-contained glTF files" : "2D configuration files must be JPEG, PNG, or WebP images" });
        }
        if (isModel && modelExtension === ".gltf") {
          try {
            const gltf = JSON.parse(await fs.readFile(uploadedFile.path, "utf8"));
            const externalAssets = [...(gltf.buffers ?? []), ...(gltf.images ?? [])].some((asset) => asset.uri && !asset.uri.startsWith("data:"));
            if (externalAssets) throw new Error("glTF model assets must be embedded in the .gltf file");
          } catch (error) {
            await removeUploads();
            return res.status(400).json({ success: false, message: error.message === "glTF model assets must be embedded in the .gltf file" ? error.message : "The .gltf file is invalid or has external assets; upload a self-contained glTF file or GLB" });
          }
        }
        seenSlots.add(slotKey);
        // Compress GLB files in-place before storing the URL.
        if (isModel && modelExtension === ".glb") {
          try {
            await compressGlb(uploadedFile.path);
          } catch (compressionError) {
            // Compression is best-effort — log and continue with the original file.
            console.error("[project updateMedia] GLB compression failed:", compressionError.message);
          }
        }
        configurations[index][field] = toUrl(uploadedFile.path);
        listing.markModified(`${section}.configurations`);
      }
    }

    const validateYoutube = (value, field) => {
      if (value === undefined) return { valid: true };
      if (value === "null" || value === "") return { valid: true, value: undefined };
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
        if (url.hostname !== "youtu.be" && !url.hostname.endsWith("youtube.com")) throw new Error();
        return { valid: true, value };
      } catch { return { valid: false, message: `${field} must be a valid YouTube URL` }; }
    };
    const videoUrl = validateYoutube(req.body.ytVideoUrl, "ytVideoUrl");
    const reelUrl = validateYoutube(req.body.ytReelUrl, "ytReelUrl");
    if (!videoUrl.valid || !reelUrl.valid) {
      await removeUploads();
      return res.status(400).json({ success: false, message: videoUrl.message ?? reelUrl.message });
    }

    const clearVideo = req.body.clearVideo === "true";
    const clearReel = req.body.clearReelVideo === "true";
    const clearBrochure = req.body.clearBrochure === "true";
    const videoFile = req.files?.video?.[0];
    const reelFile = req.files?.reelVideo?.[0];
    const brochureFile = req.files?.brochure?.[0];
    if ((clearVideo && videoFile) || (clearReel && reelFile) || (clearBrochure && brochureFile)) {
      await removeUploads();
      return res.status(400).json({ success: false, message: "Choose either a replacement file or remove it, not both" });
    }
    const videos = { ...(listing.media?.videos?.toObject?.() ?? listing.media?.videos ?? {}) };
    const reel = { ...(listing.media?.reelVideo?.toObject?.() ?? listing.media?.reelVideo ?? {}) };
    if (req.body.ytVideoUrl !== undefined) videos.ytVideoUrl = videoUrl.value;
    if (req.body.ytReelUrl !== undefined) reel.ytReelUrl = reelUrl.value;
    if (videoFile) videos.videoUrl = toUrl(videoFile.path);
    else if (clearVideo) videos.videoUrl = undefined;
    if (reelFile) reel.reelUrl = toUrl(reelFile.path);
    else if (clearReel) reel.reelUrl = undefined;

    listing.media = listing.media ?? {};
    listing.media.images = nextImages;
    listing.media.videos = videos;
    listing.media.reelVideo = reel;
    const oldBrochureUrl = listing.brochureUrl;
    if (brochureFile) listing.brochureUrl = toUrl(brochureFile.path);
    else if (clearBrochure) listing.brochureUrl = undefined;
    listing.status = await resolveStatus(req.user);
    await listing.save();
    if (oldBrochureUrl && oldBrochureUrl !== listing.brochureUrl) {
      const oldPath = resolveStoredBrochurePath(oldBrochureUrl);
      if (oldPath) await fs.unlink(oldPath).catch((error) => {
        if (error.code !== "ENOENT") console.error("[project updateMedia] Could not remove replaced brochure:", error.message);
      });
    }
    return res.json({ success: true, message: listing.status === "Active" ? "Project media updated successfully" : "Project media updated and sent for review", data: { ...listing.media.toObject?.() ?? listing.media, brochureUrl: listing.brochureUrl } });
  } catch (error) {
    await removeUploads();
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { create, uploadMedia, updateProject, updateProjectStatus, updateMedia, getActiveIdealFor, getMyListings, getProjectById };
