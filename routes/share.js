const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const shareController = require("../controllers/shareController");

const router = express.Router();

router.post("/create/:fileId", authMiddleware, shareController.createShare);
router.get("/public/:token", shareController.getPublicShare);
router.get("/signed/:fileId", authMiddleware, shareController.getSignedUrl);
router.put("/:shareId", authMiddleware, shareController.updateShare);
router.delete("/:shareId", authMiddleware, shareController.deleteShare);

module.exports = router;
