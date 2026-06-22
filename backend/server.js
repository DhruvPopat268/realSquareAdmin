require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./database/config");
const routes = require("./routes/index");

const app = express();

// ── Connect Database
connectDB();

// ── Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://192.168.0.184:8080", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "RealSquare API is running", env: process.env.NODE_ENV });
});

// ── API Routes
app.use("/api", routes);

// ── 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
