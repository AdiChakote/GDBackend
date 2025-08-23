const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const folderController = require("../controllers/folderController");
const supabase = require("../utils/supabaseClient");

const router = express.Router();

// Create folder
router.post("/", authMiddleware, folderController.createFolder);

// Rename folder
router.put("/:id", authMiddleware, folderController.renameFolder);

// Delete folder
router.delete("/:id", authMiddleware, folderController.deleteFolder);

// ✅ New: Get all folders for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
