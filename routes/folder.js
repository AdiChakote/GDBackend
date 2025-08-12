const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const folderController = require("../controllers/folderController");

const router = express.Router();

router.post("/", authMiddleware, folderController.createFolder);
router.put("/:id", authMiddleware, folderController.renameFolder);
router.delete("/:id", authMiddleware, folderController.deleteFolder);

module.exports = router;
