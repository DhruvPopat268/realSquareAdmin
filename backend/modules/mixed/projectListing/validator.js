const { body } = require("express-validator");
const mongoose = require("mongoose");
const PropertyCategory = require("../../admin/propertyCategories/model");
const IdealFor = require("../../admin/idealFor/model");

const activeRecord = (Model, label) => async (id) => {
  const record = await Model.findById(id).select("isActive");
  if (!record) throw new Error(`${label} not found`);
  if (!record.isActive) throw new Error(`${label} is inactive`);
};

const validArea = (area) => {
  if (typeof area === "number") return Number.isFinite(area) && area > 0;
  return area && typeof area === "object"
    && Number.isFinite(Number(area.value)) && Number(area.value) > 0
    && ["sqft", "sqyd", "sqmt"].includes(area.unit);
};

const projectListingValidator = [
  body("categoryId")
    .notEmpty().withMessage("categoryId is required")
    .isMongoId().withMessage("categoryId must be a valid ID")
    .bail().custom(activeRecord(PropertyCategory, "Category")),
  body("idealFor")
    .custom(async (ids, { req }) => {
      if (req.body.categoryId !== process.env.CATEGORY_COMMERCIAL_ID) return true;
      if (!Array.isArray(ids) || ids.length === 0) throw new Error("Select at least one Ideal For option");
      if (ids.some((id) => !mongoose.isValidObjectId(id))) throw new Error("Ideal For options must contain valid IDs");
      if (new Set(ids.map(String)).size !== ids.length) throw new Error("Ideal For options cannot contain duplicates");
      const options = await IdealFor.find({ _id: { $in: ids }, isActive: true }).select("_id");
      if (options.length !== ids.length) throw new Error("Select only active Ideal For options");
      return true;
    }),
  body("cityName").trim().notEmpty().withMessage("cityName is required").isString().withMessage("cityName must be a string"),
  body("projectName").trim().notEmpty().withMessage("projectName is required").isString(),
  body("developerName").trim().notEmpty().withMessage("developerName is required").isString(),
  body("locality").isObject().withMessage("locality must be an object"),
  body("locality.address").trim().notEmpty().withMessage("locality.address is required").isString(),
  body("locality.latitude").optional({ nullable: true }).isFloat().withMessage("locality.latitude must be numeric"),
  body("locality.longitude").optional({ nullable: true }).isFloat().withMessage("locality.longitude must be numeric"),
  body("projectStatus")
    .notEmpty().withMessage("projectStatus is required")
    .isIn(["Ready to Move", "Under Construction", "New Launch"])
    .withMessage("projectStatus must be Ready to Move, Under Construction, or New Launch"),
  body("possessionDate").custom((value, { req }) => {
    if (req.body.projectStatus === "Ready to Move") return true;
    if (!value) throw new Error("possessionDate is required unless the project is Ready to Move");
    if (Number.isNaN(new Date(value).getTime())) throw new Error("possessionDate must be a valid date");
    return true;
  }),
  body("totalUnits").notEmpty().withMessage("totalUnits is required").isInt({ min: 1 }).withMessage("totalUnits must be a positive integer"),
  body("availableUnits")
    .notEmpty().withMessage("availableUnits is required")
    .isInt({ min: 1 }).withMessage("availableUnits must be a positive integer")
    .custom((value, { req }) => {
      if (Number(value) > Number(req.body.totalUnits)) throw new Error("availableUnits cannot exceed totalUnits");
      return true;
    }),
  body("towerCount").optional({ nullable: true }).isInt({ min: 1 }).withMessage("towerCount must be a positive integer"),
  body("minPrice").notEmpty().withMessage("minPrice is required").isFloat({ min: 0 }).withMessage("minPrice must be a non-negative number"),
  body("maxPrice")
    .notEmpty().withMessage("maxPrice is required")
    .isFloat({ min: 0 }).withMessage("maxPrice must be a non-negative number")
    .custom((value, { req }) => {
      if (Number(value) < Number(req.body.minPrice)) throw new Error("maxPrice must be greater than or equal to minPrice");
      return true;
    }),
  body("residentialConfigurations").custom((value, { req }) => {
    const categoryId = process.env.CATEGORY_RESIDENTIAL_ID;
    if (req.body.categoryId !== categoryId) return true;
    const configurations = req.body.residentialDetails?.configurations ?? value;
    if (!Array.isArray(configurations) || configurations.length < 1) {
      throw new Error("At least one residential BHK configuration is required");
    }
    if (configurations.some((item) => typeof item !== "string" && (!item || typeof item.bhk !== "string" || !item.bhk.trim()))) {
      throw new Error("Each residential configuration must include a BHK option");
    }
    const areaUnit = req.body.residentialAreaUnit ?? req.body.residentialDetails?.areaUnit;
    const configurationsWithCarpetArea = configurations.filter((item) => typeof item !== "string" && item.carpetArea !== undefined);
    if (areaUnit !== undefined && !["sqft", "sqyd", "sqmt"].includes(areaUnit)) {
      throw new Error("Residential area unit must be sqft, sqyd, or sqmt");
    }
    if (configurationsWithCarpetArea.length > 0 && !["sqft", "sqyd", "sqmt"].includes(areaUnit)) {
      throw new Error("A shared residential area unit is required when carpet areas are provided");
    }
    for (const configuration of configurationsWithCarpetArea) {
      const carpetArea = configuration.carpetArea;
      const carpetValue = typeof carpetArea === "object" ? Number(carpetArea.value) : Number(carpetArea);
      if (!validArea(carpetArea)) {
        throw new Error("Each residential configuration must have a valid carpet area");
      }
      if (typeof carpetArea === "object" && carpetArea.unit && carpetArea.unit !== areaUnit) {
        throw new Error("All residential configurations must use the selected area unit");
      }
      if (carpetValue <= 0) throw new Error("Each residential carpet area must be greater than zero");
    }
    return true;
  }),
  body("commercialConfigurations").custom((value, { req }) => {
    const categoryId = process.env.CATEGORY_COMMERCIAL_ID;
    if (req.body.categoryId !== categoryId) return true;
    const configurations = req.body.commercialDetails?.configurations ?? value;
    const areaUnit = req.body.commercialAreaUnit ?? req.body.commercialDetails?.areaUnit;
    if (!Array.isArray(configurations) || configurations.length < 1) {
      throw new Error("At least one commercial area configuration is required");
    }
    if (!["sqft", "sqyd", "sqmt"].includes(areaUnit)) {
      throw new Error("Commercial area unit must be sqft, sqyd, or sqmt");
    }
    for (const configuration of configurations) {
      const carpetArea = configuration?.carpetArea;
      if (!validArea(carpetArea)) {
        throw new Error("Each commercial configuration must have a valid carpet area");
      }
      if (typeof carpetArea === "object" && carpetArea.unit && carpetArea.unit !== areaUnit) {
        throw new Error("All commercial configurations must use the selected area unit");
      }
    }
    return true;
  }),
];

module.exports = { projectListingValidator };
