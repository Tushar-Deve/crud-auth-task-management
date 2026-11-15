const express = require("express");
const cookieParser=require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
require("./config/db");
const app = express();

app.set("trust proxy", 1);


const clientOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// CORS Middleware
app.use(
  cors({
     origin: [
      "http://localhost:3000",
      "https://crud-auth-task-management.vercel.app",
      process.env.FRONTEND_URL,
      ...clientOrigins,
    ].filter(Boolean),
    credentials: true,
  })
);

//Built in Middleware
app.use(express.json());
app.use(cookieParser());

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const { downloadLegacyAttachment } = require("./controllers/taskController");
app.use("/authRoutes",authRoutes);
app.use("/taskRoutes",taskRoutes);
app.use("/adminRoutes",adminRoutes);
// Previous attachment URLs remain available only after authentication and
// task-level authorization. This is not a static file mount.
app.get("/uploads/:filename", authMiddleware, downloadLegacyAttachment);


//Test routes
app.get("/", (req, res) => {
    res.send("API is running...");
});

module.exports = app;
