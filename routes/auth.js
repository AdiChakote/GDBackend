const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const multer = require("multer");
const fileController = require("../controllers/fileController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  fileController.uploadFile
);

module.exports = router;
