const PropertyCategory = require("../../admin/propertyCategories/model");
const PropertyPurpose = require("../../admin/propertyPurposes/model");
const PropertyType = require("../../admin/propertyTypes/model");

const getActivePropertyCategories = async (_req, res) => {
  try {
    const categories = await PropertyCategory.find({ isActive: true })
      .select("name description order")
      .sort({ order: 1, name: 1 });

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getActivePropertyPurposes = async (_req, res) => {
  try {
    const purposes = await PropertyPurpose.find({ isActive: true })
      .select("name description order")
      .sort({ order: 1, name: 1 });

    res.json({ success: true, data: purposes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getActivePropertyTypes = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.categoryId) filter.propertyCategory = req.query.categoryId;

    const types = await PropertyType.find(filter)
      .select("name description order propertyCategory")
      .populate("propertyCategory", "name")
      .sort({ order: 1, name: 1 });

    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getActivePropertyCategories,
  getActivePropertyPurposes,
  getActivePropertyTypes,
};
