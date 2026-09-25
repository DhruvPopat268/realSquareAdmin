const { Inquiry } = require("./model");
const SystemUser   = require("../../systemUsers.model");

/**
 * Create a new inquiry
 * Returns the created inquiry and list of eligible users for assignment
 */
const createInquiry = async (req, res) => {
  try {
    const userId = req.user?._id;
    const user   = req.user;

    const {
      isProperty, listingType, propertyCategory, propertyType,
      preferredCity, preferredArea, budget, bhk, builtUpArea,
      plotArea, furnishingType, inquiryClassification, lastFollowUpDate,
      remarks, preferredCommunication,
    } = req.body;

    // Build createdBy object from logged-in user
    const createdByData = {
      id:     userId,
      name:   user.name || user.ownerProfile?.fullName || user.brokerProfile?.fullName || user.builderProfile?.fullName,
      mobile: user.mobile,
      role:   user.role?._id,
    };

    // Profile completion check
    if (!createdByData.name || !createdByData.mobile || !createdByData.role) {
      return res.status(400).json({
        success: false,
        message: "User profile is incomplete. Name, mobile, and role are required.",
      });
    }

    // Build inquiry document
    const inquiryData = {
      createdBy: createdByData,
      isProperty,
      listingType,
      preferredCity,
      budget: { min: budget.min, max: budget.max },
      furnishingType,
      inquiryClassification,
      lastFollowUpDate,
      preferredCommunication,
      status: "active",
      ...(propertyCategory                && { propertyCategory }),
      ...(propertyType                    && { propertyType }),
      ...(preferredArea                   && { preferredArea }),
      ...(bhk !== undefined               && { bhk }),
      ...(builtUpArea                     && { builtUpArea }),
      ...(plotArea                        && { plotArea }),
      ...(remarks                         && { remarks }),
    };

    const inquiry = await Inquiry.create(inquiryData);

    // Find eligible users for assignment (no assignment created yet)
    const eligibleUsers = await findEligibleUsers(inquiry);

    return res.status(201).json({
      success:        true,
      message:        "Inquiry created successfully",
      inquiry:        inquiry,
      eligibleUsers:  eligibleUsers,
      eligibleCount:  eligibleUsers.length,
    });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create inquiry",
      error:   error.message,
    });
  }
};

/**
 * Find eligible users for an inquiry
 * - isProperty true  → Owner, Broker, Builder whose preferredCities includes the inquiry city
 * - isProperty false → Builder only whose preferredCities includes the inquiry city
 * - Excludes the inquiry creator
 * - Profile must be complete (name, mobile, role)
 */
const findEligibleUsers = async (inquiry) => {
  try {
    const OWNER_ROLE_ID   = process.env.VITE_OWNER_ROLE_ID;
    const BROKER_ROLE_ID  = process.env.VITE_BROKER_ROLE_ID;
    const BUILDER_ROLE_ID = process.env.VITE_BUILDER_ROLE_ID;

    const roleFilter = inquiry.isProperty
      ? { role: { $in: [OWNER_ROLE_ID, BROKER_ROLE_ID, BUILDER_ROLE_ID] } }
      : { role: BUILDER_ROLE_ID };

    const users = await SystemUser.find({
      ...roleFilter,
      preferredCities: inquiry.preferredCity,
      name:            { $exists: true, $ne: "" },
      mobile:          { $exists: true, $ne: "" },
      role:            { $exists: true, $ne: null },
      _id:             { $ne: inquiry.createdBy.id },
    }).select("_id name mobile");

    return users.map((u) => ({ id: u._id, name: u.name, mobile: u.mobile }));
  } catch (error) {
    console.error("Error finding eligible users:", error);
    return [];
  }
};

module.exports = { createInquiry };
