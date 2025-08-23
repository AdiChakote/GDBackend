const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/file");
const folderRoutes = require("./routes/folder");
const shareRoutes = require("./routes/share");
const searchRoutes = require("./routes/searchRoutes");
const dashboardRoutes = require("./routes/dashboard");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GoogleDrive Backend Running");
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/search", searchRoutes);
app.use("/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
