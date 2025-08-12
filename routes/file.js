const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../utils/supabaseClient");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------------------- 1. CREATE ---------------------------- */

/**
 * Upload File
 */
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file provided" });

      const fileName = `${uuidv4()}-${file.originalname}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("files") // bucket name
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("files")
        .getPublicUrl(fileName);

      // Save metadata in database
      const { error: dbError, data: dbData } = await supabase
        .from("files")
        .insert([
          {
            name: file.originalname,
            url: publicData.publicUrl,
            size: file.size,
            type: file.mimetype,
            user_id: req.user.id,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      res.json({
        message: "File uploaded successfully",
        file: dbData,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ---------------------------- 2. READ ---------------------------- */

/**
 * List Files (excluding trashed)
 */
router.get("/", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", req.user.id)
    .is("deleted_at", null);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * Get Single File by ID
 */
router.get("/:id", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (error) return res.status(404).json({ error: "File not found" });
  res.json(data);
});

/**
 * List Trashed Files
 */
router.get("/trash/list", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", req.user.id)
    .not("deleted_at", "is", null);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ---------------------------- 3. UPDATE ---------------------------- */

/**
 * Rename File
 */
router.put("/:id", authMiddleware, async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename required" });

  const { data, error } = await supabase
    .from("files")
    .update({ name: filename })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * Restore File from Trash
 */
router.put("/restore/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("files")
    .update({ deleted_at: null })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "File restored successfully" });
});

/* ---------------------------- 4. DELETE ---------------------------- */

/**
 * Soft Delete (Move to Trash)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("files")
    .update({ deleted_at: new Date() })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "File moved to trash" });
});

/**
 * Permanent Delete
 */
router.delete("/permanent/:id", authMiddleware, async (req, res) => {
  // Get file metadata
  const { data: fileData, error: fetchError } = await supabase
    .from("files")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (fetchError) return res.status(404).json({ error: "File not found" });

  // Remove from Supabase Storage
  const storagePath = fileData.url.split("/").pop();
  await supabase.storage.from("files").remove([storagePath]);

  // Delete from DB
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "File permanently deleted" });
});

module.exports = router;
