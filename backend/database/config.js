const mongoose    = require("mongoose");
const AdminWallet = require("../modules/admin/adminWallet/model");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // ensure single admin wallet doc always exists
    await AdminWallet.findOneAndUpdate({}, {}, { upsert: true, setDefaultsOnInsert: true });
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
