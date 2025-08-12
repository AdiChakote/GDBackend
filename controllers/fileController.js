const supabase = require("../utils/supabaseClient");

exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = `${req.user.id}/${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadError)
      return res.status(500).json({ error: uploadError.message });

    const { data: publicUrlData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("files").insert([
      {
        user_id: req.user.id,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: filePath,
        url: publicUrlData.publicUrl,
      },
    ]);

    if (dbError) return res.status(500).json({ error: dbError.message });

    res.json({
      message: "File uploaded successfully",
      url: publicUrlData.publicUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
