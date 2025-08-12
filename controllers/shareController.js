const { v4: uuidv4 } = require("uuid");
const supabase = require("../utils/supabaseClient");

// Helper to extract path from URL
function extractPathFromUrl(url) {
  if (!url) return null;
  try {
    const parts = url.split("/storage/v1/object/public/");
    if (parts.length < 2) return url.split("/").pop();
    return parts[1];
  } catch {
    return url.split("/").pop();
  }
}

async function generateSignedUrlForFile(pathOrUrl) {
  const path = pathOrUrl.includes("/files/")
    ? pathOrUrl.split("/files/").pop()
    : pathOrUrl || "";
  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

// Create share
exports.createShare = async (req, res) => {
  try {
    const { fileId } = req.params;
    const {
      is_public = false,
      shared_with = null,
      role = "view",
      expires_in_seconds = null,
    } = req.body;

    const { data: file, error: fileErr } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", req.user.id)
      .single();

    if (fileErr || !file)
      return res.status(404).json({ error: "File not found or access denied" });

    const shareToken = is_public ? uuidv4() : null;
    const expires_at = expires_in_seconds
      ? new Date(Date.now() + expires_in_seconds * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from("shared_files")
      .insert([
        {
          file_id: fileId,
          owner_id: req.user.id,
          shared_with,
          role,
          share_token: shareToken,
          is_public,
          expires_at,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.json({ share: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Public access via token
exports.getPublicShare = async (req, res) => {
  try {
    const { token } = req.params;
    const { data: shareData, error } = await supabase
      .from("shared_files")
      .select("*, files(*)")
      .eq("share_token", token)
      .eq("is_public", true)
      .single();

    if (error || !shareData)
      return res.status(404).json({ error: "Share not found" });

    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      return res.status(410).json({ error: "Share link expired" });
    }

    const file = shareData.files;
    const signed = await generateSignedUrlForFile(file.path || file.url);
    res.json({ share: shareData, file, signedUrl: signed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Signed URL for authenticated user
exports.getSignedUrl = async (req, res) => {
  try {
    const { fileId } = req.params;
    const expires_in = parseInt(req.query.expires_in) || 60;

    const { data: file, error: fileErr } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileErr || !file)
      return res.status(404).json({ error: "File not found" });

    if (file.user_id !== req.user.id) {
      const { data: permission } = await supabase
        .from("shared_files")
        .select("*")
        .eq("file_id", fileId)
        .eq("shared_with", req.user.id)
        .single();

      if (!permission) return res.status(403).json({ error: "Access denied" });
    }

    const filePath = file.path || extractPathFromUrl(file.url);
    const { data } = await supabase.storage
      .from("files")
      .createSignedUrl(filePath, expires_in);

    res.json({ signedUrl: data.signedUrl, expires_in });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update share
exports.updateShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    const {
      role,
      expires_in_seconds = null,
      is_public = null,
      shared_with = null,
    } = req.body;

    const { data: share } = await supabase
      .from("shared_files")
      .select("*")
      .eq("id", shareId)
      .single();

    if (!share) return res.status(404).json({ error: "Share not found" });
    if (share.owner_id !== req.user.id)
      return res.status(403).json({ error: "Only owner can edit share" });

    const expires_at = expires_in_seconds
      ? new Date(Date.now() + expires_in_seconds * 1000).toISOString()
      : expires_in_seconds === null
      ? share.expires_at
      : null;

    const { data, error } = await supabase
      .from("shared_files")
      .update({ role, expires_at, is_public, shared_with })
      .eq("id", shareId)
      .select()
      .single();

    if (error) throw error;
    res.json({ share: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete share
exports.deleteShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { data: share } = await supabase
      .from("shared_files")
      .select("*")
      .eq("id", shareId)
      .single();

    if (!share) return res.status(404).json({ error: "Share not found" });
    if (share.owner_id !== req.user.id)
      return res.status(403).json({ error: "Only owner can revoke share" });

    const { error } = await supabase
      .from("shared_files")
      .delete()
      .eq("id", shareId);

    if (error) throw error;
    res.json({ message: "Share revoked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
