const SystemUser = require("../modules/systemUsers.model");

const getAdminUserStats = async (scopeFilter) => {
  const [total, active, inactive, deleted] = await Promise.all([
    SystemUser.countDocuments(scopeFilter),
    SystemUser.countDocuments({ ...scopeFilter, isDeleted: { $ne: true }, isActive: true }),
    SystemUser.countDocuments({ ...scopeFilter, isDeleted: { $ne: true }, isActive: { $ne: true } }),
    SystemUser.countDocuments({ ...scopeFilter, isDeleted: true }),
  ]);

  return { total, active, inactive, deleted };
};

module.exports = getAdminUserStats;
