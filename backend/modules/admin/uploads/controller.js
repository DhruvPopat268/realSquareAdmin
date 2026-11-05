const uploadImageFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "An image file is required in the 'image' field",
    });
  }

  const backendUrl = (process.env.BACKEND_URL ?? "").replace(/\/+$/, "");
  const url = `${backendUrl}/storage/images/${encodeURIComponent(req.file.filename)}`;

  return res.status(201).json({
    success: true,
    data: {
      url,
      filename: req.file.filename,
    },
  });
};

module.exports = { uploadImageFile };
