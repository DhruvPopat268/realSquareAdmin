const { validationResult } = require("express-validator");
const VirtualSpace = require("./model");

const getVirtualSpaces = async (req, res) => {
  try {
    const filter = {};

    if (req.query.isActive === "true") filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    if (req.query.search) filter.title = new RegExp(req.query.search.trim(), "i");

    const data = await VirtualSpace.find(filter).sort({ updatedAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createVirtualSpace = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const title = req.body.title.trim();
    const duplicate = await VirtualSpace.findOne({ title }).collation({
      locale: "en",
      strength: 2,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Virtual space title already exists",
      });
    }

    const data = await VirtualSpace.create({
      ...req.body,
      title,
      benefits: req.body.benefits.map((item) => item.trim()),
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateVirtualSpace = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const patch = { ...req.body };
    if (patch.title !== undefined) patch.title = patch.title.trim();
    if (patch.benefits !== undefined) {
      patch.benefits = patch.benefits.map((item) => item.trim());
    }

    if (patch.title !== undefined) {
      const duplicate = await VirtualSpace.findOne({
        title: patch.title,
        _id: { $ne: req.params.id },
      }).collation({ locale: "en", strength: 2 });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Virtual space title already exists",
        });
      }
    }

    const data = await VirtualSpace.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Virtual space benefits not found",
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteVirtualSpace = async (req, res) => {
  try {
    const data = await VirtualSpace.findByIdAndDelete(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Virtual space benefits not found",
      });
    }

    res.json({
      success: true,
      message: "Virtual space benefits deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getVirtualSpaces,
  createVirtualSpace,
  updateVirtualSpace,
  deleteVirtualSpace,
};
