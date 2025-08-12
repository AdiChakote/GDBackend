const supabase = require("../utils/supabaseClient");

// Create folder
exports.createFolder = async (req, res) => {
  const { name, parent_id } = req.body;
  const { data, error } = await supabase
    .from("folders")
    .insert([{ name, parent_id, user_id: req.user.id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// Rename folder
exports.renameFolder = async (req, res) => {
  const { name } = req.body;
  const { data, error } = await supabase
    .from("folders")
    .update({ name })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// Soft delete folder
exports.deleteFolder = async (req, res) => {
  const { error } = await supabase
    .from("folders")
    .update({ deleted_at: new Date() })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Folder moved to trash" });
};
