// routes/searchRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { searchItems } = require("../controllers/searchController");

router.get("/", authMiddleware, searchItems);

module.exports = router;
