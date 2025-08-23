const express = require("express");
const router = express.Router();

// GET /dashboard
router.get("/", async (req, res) => {
  try {
    // Temporary dummy data — replace with real DB query later
    const dashboardData = {
      message: "Dashboard data fetched successfully",
      filesCount: 5,
      foldersCount: 2,
      recentFiles: [
        { id: 1, name: "Document.pdf", size: "1.2 MB" },
        { id: 2, name: "Image.png", size: "600 KB" },
      ],
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    res
      .status(500)
      .json({ error: "Something went wrong while fetching dashboard data" });
  }
});

module.exports = router;
