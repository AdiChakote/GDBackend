const supabase = require("../utils/supabaseClient");

exports.searchItems = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const offset = (page - 1) * limit;

    // Full-text search on files
    const { data: files, error: fileErr } = await supabase
      .from("files")
      .select("*")
      .textSearch("name", query, { type: "websearch" })
      .eq("user_id", req.user.id)
      .range(offset, offset + limit - 1);

    if (fileErr) throw fileErr;

    // Full-text search on folders
    const { data: folders, error: folderErr } = await supabase
      .from("folders")
      .select("*")
      .textSearch("name", query, { type: "websearch" })
      .eq("user_id", req.user.id)
      .range(offset, offset + limit - 1);

    if (folderErr) throw folderErr;

    res.json({
      query,
      page: parseInt(page),
      limit: parseInt(limit),
      results: { files, folders },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
