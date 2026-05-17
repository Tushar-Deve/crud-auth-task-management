const express = require("express");
const cookieParser=require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
require("./config/db");

const app = express();

// ✅ uploads folder auto-create
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("Uploads folder created");
}


//Cors Middleware
app.use(cors());

//Built in Middleware
app.use(express.json());
app.use(cookieParser());

/* ✅ STATIC FILES HERE */
app.use("/uploads", express.static("uploads"));

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
app.use("/authRoutes",authRoutes);
app.use("/taskRoutes",taskRoutes);


//Test routes
app.get("/", (req, res) => {
    res.send("API is running...");
});

module.exports = app;