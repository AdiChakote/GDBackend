const express = require("express");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middlewares/authMiddleware");
const supabase = require("../utils/supabaseClient");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

/**
 * 📂 Upload File
 */
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const fileName = `${uuidv4()}-${file.originalname}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicData, error: publicError } = supabase.storage
        .from("files")
        .getPublicUrl(fileName);

      if (publicError) throw publicError;

      // Save metadata in DB
      const { data: dbData, error: dbError } = await supabase
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

      res.json({ message: "✅ File uploaded successfully", file: dbData });
    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * 📧 Share File (invite by email)
 */
router.post("/share", authMiddleware, async (req, res) => {
  try {
    const { fileId, email, permission } = req.body;

    if (!fileId || !email) {
      return res.status(400).json({ error: "File ID and email required" });
    }

    const { error } = await supabase.from("file_shares").insert([
      {
        file_id: fileId,
        email,
        permission,
        shared_by: req.user.id,
      },
    ]);

    if (error) throw error;

    res.json({ success: true, message: "✅ Invitation recorded" });
  } catch (err) {
    console.error("Share error:", err);
    res.status(500).json({ error: "❌ Failed to share file" });
  }
});

/**
 * 🔗 Generate Public Share Link
 */
router.post("/generate-link", authMiddleware, async (req, res) => {
  try {
    const { fileId, permission } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "File ID required" });
    }

    // Generate unique token
    const token = uuidv4();

    const { error } = await supabase.from("file_shares").insert([
      {
        file_id: fileId,
        email: `public-${token}`, // mark public shares uniquely
        permission,
        shared_by: req.user.id,
      },
    ]);

    if (error) throw error;

    const link = `${process.env.FRONTEND_URL}/share/${fileId}?token=${token}`;

    res.json({ link });
  } catch (err) {
    console.error("Generate link error:", err);
    res.status(500).json({ error: "❌ Failed to generate link" });
  }
});

/**
 * 🌍 Public: Get shared file details
 */
router.get("/shared/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { token } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: "File ID required" });
    }

    // Check if public share with this token exists
    const { data: share, error: shareError } = await supabase
      .from("file_shares")
      .select("*")
      .eq("file_id", fileId)
      .ilike("email", `public-${token}`) // match the generated token
      .single();

    if (shareError || !share) {
      return res.status(403).json({ error: "Invalid or expired link" });
    }

    // Fetch file metadata
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("id, name, url, size, type")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({ file, permission: share.permission });
  } catch (err) {
    console.error("Shared file fetch error:", err);
    res.status(500).json({ error: "❌ Failed to fetch shared file" });
  }
});

module.exports = router;
