const { Pool } = require("pg");
require("dotenv").config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.query("SELECT NOW()")
  .then(() => console.log("DB test success ✅"))
  .catch(err => console.error("DB error ❌", err));

console.log("✅ PostgreSQL (Neon) connected");

module.exports = db;