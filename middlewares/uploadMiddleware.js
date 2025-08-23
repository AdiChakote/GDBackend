// backend/middlewares/uploadMiddleware.js
const multer = require("multer");

const storage = multer.memoryStorage(); // store file in memory so we can upload buffer to Supabase

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

module.exports = upload;
