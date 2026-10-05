const SystemUser = require("../systemUsers.model");

const getUserDetailsSnapshot = async (userOrId) => {
  let user = userOrId;

  if (!user || !user.mobile || !user.name) {
    const userId = user?._id || user;
    user = await SystemUser.findById(userId)
      .select("name mobile ownerProfile.businessDetails.name ownerProfile.businessDetails.mobile brokerProfile.agencyName")
      .lean();
  }

  const name = user?.name
    || user?.ownerProfile?.businessDetails?.name
    || user?.brokerProfile?.agencyName;
  const mobile = user?.mobile || user?.ownerProfile?.businessDetails?.mobile;

  if (!name || !mobile) {
    throw new Error("Could not create userDetails snapshot: user name and mobile are required");
  }

  return { name, mobile };
};

module.exports = getUserDetailsSnapshot;
