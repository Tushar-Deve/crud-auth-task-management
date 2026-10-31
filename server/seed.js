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
        status VARCHAR(30) CHECK (status IN ('pending', 'in-progress', 'completed')),
        assigned_to INT REFERENCES "User"(id) ON DELETE SET NULL,
        assigned_by INT REFERENCES "User"(id) ON DELETE SET NULL,
        "created_at" TIMESTAMP DEFAULT NOW()
        );
      `);

    // Existing databases may store Task.status as either a CHECK-constrained
    // string or the TaskStatus enum. Update the constraint/type accordingly.
    const taskStatusColumn = await db.query(`
      SELECT status_type.typname, status_type.typtype
      FROM pg_attribute AS status_column
      JOIN pg_type AS status_type ON status_type.oid = status_column.atttypid
      WHERE status_column.attrelid = '"Task"'::regclass
        AND status_column.attname = 'status'
        AND NOT status_column.attisdropped
    `);

    const statusType = taskStatusColumn.rows[0];
    if (!statusType) {
      throw new Error('Could not determine the Task.status database type.');
    }

    if (statusType.typtype === 'e') {
      if (statusType.typname !== 'TaskStatus') {
        throw new Error(`Unsupported Task.status enum: ${statusType.typname}`);
      }
      await db.query(`ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'in-progress'`);
    } else {
      // CREATE TABLE IF NOT EXISTS does not update a constraint on an
      // existing string column, so replace its status check idempotently.
      await db.query(`
        DO $$
        DECLARE constraint_row RECORD;
        BEGIN
          FOR constraint_row IN
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = '"Task"'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%status%'
          LOOP
            EXECUTE format('ALTER TABLE "Task" DROP CONSTRAINT %I', constraint_row.conname);
          END LOOP;

          ALTER TABLE "Task"
          ADD CONSTRAINT task_status_allowed
          CHECK (status IN ('pending', 'in-progress', 'completed'));
        END $$;
      `);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS "TaskHistory"(
      id SERIAL PRIMARY KEY,
      taskId INT REFERENCES "Task"(id),
      updatedBy INT REFERENCES "User"(id),
      status VARCHAR(30) CHECK (status IN ('pending', 'completed')),
      updatedAt TIMESTAMP DEFAULT NOW(),
      "isRead" BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    await db.query(`
      ALTER TABLE "TaskHistory"
      ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await db.query(`
      INSERT INTO "TaskHistory"("taskId", "updatedBy", status, "isRead")
      SELECT t.id, t.assigned_by, 'pending', FALSE
      FROM "Task" t
      WHERE t.assigned_to IS NOT NULL
        AND COALESCE(t.status, 'pending') <> 'completed'
        AND NOT EXISTS (
          SELECT 1
          FROM "TaskHistory" th
          WHERE th."taskId" = t.id AND th.status = 'pending'
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
