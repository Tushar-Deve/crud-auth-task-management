const express = require("express");
const cookieParser=require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
require("./config/db");
const path = require("path");
const fs = require("fs");

const app = express();

// ✅ uploads folder auto-create
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}


//Cors Middleware
app.use(
  cors({
     origin: [
      "http://localhost:3000",
      "https://YOUR-VERCEL-DOMAIN.vercel.app",
    ],
  })
);

//Built in Middleware
app.use(express.json());
app.use(cookieParser());

/* ✅ STATIC FILES HERE */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const adminRoutes = require("./routes/adminRoutes");
app.use("/authRoutes",authRoutes);
app.use("/taskRoutes",taskRoutes);
app.use("/adminRoutes",adminRoutes);


//Test routes
app.get("/", (req, res) => {
    res.send("API is running...");
});

module.exports = app;