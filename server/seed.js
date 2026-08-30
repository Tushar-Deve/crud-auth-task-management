const db = require("./config/db");

async function seed() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "User"(  
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(10) CHECK (role IN ('admin', 'user')) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
        );
      `);

    await db.query(`
  ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP NULL;
`);

    await db.query(`
        CREATE TABLE IF NOT EXISTS "Task"(
        id SERIAL PRIMARY KEY,
        title VARCHAR(100),
        description TEXT,
        priority VARCHAR(20) CHECK (
          priority IN ('low', 'medium', 'high')
        ),
        due_date DATE,
        status VARCHAR(30) CHECK (status IN ('pending', 'completed')),
        assigned_to INT REFERENCES "User"(id) ON DELETE SET NULL,
        assigned_by INT REFERENCES "User"(id) ON DELETE SET NULL,
        "created_at" TIMESTAMP DEFAULT NOW()
        );
      `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS "TaskHistory"(
      id SERIAL PRIMARY KEY,
      taskId INT REFERENCES "Task"(id),
      updatedBy INT REFERENCES "User"(id),
      status VARCHAR(30) CHECK (status IN ('pending', 'completed')),
      updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
CREATE TABLE IF NOT EXISTS "TaskAttachments" (
    id SERIAL PRIMARY KEY,
    taskId INTEGER REFERENCES "Task"(id) ON DELETE CASCADE,
    fileUrl TEXT,
    uploadedBy INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);
    console.log("Tables created successfully ✅");
    process.exit();
  }
  catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seed()