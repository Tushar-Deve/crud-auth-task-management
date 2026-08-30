const db = require("../config/db");
const bcrypt = require("bcrypt");

// --------------------
// Create User (Admin)
// --------------------

exports.createUser = async (req, res) => {
    try {

        const { name, email, password } = req.body;

        // Validation

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!email.includes("@")) {
            return res.status(400).json({
                success: false,
                message: "Invalid email"
            });
        }

        // Check Email

        const existingUser = await db.query(
            `SELECT id FROM "User" WHERE email=$1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        // Password Validation

        const strongPassword =
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;

        if (!strongPassword.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain letters and numbers"
            });
        }

        // Hash Password

        const hashedPassword = await bcrypt.hash(password, 12);

        // Create User

        const newUser = await db.query(
            `INSERT INTO "User"
            (name,email,password,role)
            VALUES($1,$2,$3,$4)
            RETURNING id,name,email,role,"createdAt"`,
            [
                name,
                email,
                hashedPassword,
                "user"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: newUser.rows[0]
        });

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ----------------------
// Get All Users
// ----------------------

exports.getAllUsers = async (req, res) => {
    try {

        const result = await db.query(`
            SELECT
                id,
                name,
                email,
                role,
                "createdAt"
            FROM "User"
            ORDER BY id ASC
        `);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            users: result.rows
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// ----------------------
// Get User By ID
// ----------------------

exports.getUser = async (req, res) => {
    try {

        const { id } = req.params;

        const result = await db.query(
            `SELECT
                id,
                name,
                email,
                role,
                "createdAt"
            FROM "User"
            WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// ----------------------
// Update User
// ----------------------

exports.updateUser = async (req, res) => {
    try {

        const { id } = req.params;
        const { name, email } = req.body;

        // Validation

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and Email are required"
            });
        }

        // Check User Exists

        const existingUser = await db.query(
            `SELECT id FROM "User" WHERE id = $1`,
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check Email Already Exists (except current user)

        const emailExists = await db.query(
            `SELECT id FROM "User"
             WHERE email = $1 AND id != $2`,
            [email, id]
        );

        if (emailExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        // Update User

        const result = await db.query(
            `UPDATE "User"
             SET name=$1,
                 email=$2
             WHERE id=$3
             RETURNING id,name,email,role,"createdAt"`,
            [name, email, id]
        );

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// ----------------------
// Delete User
// ----------------------

exports.deleteUser = async (req, res) => {
    try {

        const { id } = req.params;

        // Check if user exists
        const existingUser = await db.query(
            `SELECT id FROM "User" WHERE id = $1`,
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const assignedTasks = await db.query(
            `SELECT id FROM "Task" WHERE "assigned_to" = $1 LIMIT 1`,
            [id]
        );

        if (assignedTasks.rows.length > 0) {
            return res.status(409).json({
                success: false,
                needsReassign: true,
                message: "User has assigned tasks. Please reassign or delete the tasks first."
            });
        }


        // Delete user
        await db.query(
            `DELETE FROM "User" WHERE id = $1`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// ----------------------
// Get Reassign Users
// ----------------------   

exports.getReassignUsers = async (req, res) => {
    try {

        const { id } = req.params;

        const users = await db.query(
            `
            SELECT
                id,
                name,
                email
            FROM "User"
            WHERE id != $1
            ORDER BY name ASC
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            users: users.rows,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// -----------------
// GetDAshboard API 
// -----------------

exports.getDashboard = async (req, res) => {
    try {
        // Total Users
        const totalUsersResult = await db.query(
            `SELECT COUNT(*) FROM "User"`
        );

        // Total Tasks
        const totalTasksResult = await db.query(
            `SELECT COUNT(*) FROM "Task"`
        );

        // Pending Tasks
        const pendingTasksResult = await db.query(
            `SELECT COUNT(*) FROM "Task" WHERE status='pending'`
        );

        // Completed Tasks
        const completedTasksResult = await db.query(
            `SELECT COUNT(*) FROM "Task" WHERE status='completed'`
        );

        // Recent Users
        const recentUsersResult = await db.query(`
  SELECT
    id,
    name,
    email,
    role,
    "createdAt"
  FROM "User"
  ORDER BY "createdAt" DESC
  LIMIT 5
`);

        // Recent Tasks
        const recentTasksResult = await db.query(
            `
      SELECT
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.due_date,
    t.assigned_to,  
    t.assigned_by,

    u1.name AS assigned_to_name,
    u2.name AS assigned_by_name

FROM "Task" t

LEFT JOIN "User" u1
ON t.assigned_to = u1.id

LEFT JOIN "User" u2
ON t.assigned_by = u2.id

ORDER BY t.id DESC
LIMIT 5;
      `
        );

        res.status(200).json({
            success: true,

            stats: {
                totalUsers: Number(totalUsersResult.rows[0].count),
                totalTasks: Number(totalTasksResult.rows[0].count),
                pendingTasks: Number(pendingTasksResult.rows[0].count),
                completedTasks: Number(completedTasksResult.rows[0].count),
            },

            recentUsers: recentUsersResult.rows,

            recentTasks: recentTasksResult.rows,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to load dashboard",
        });
    }
};

// ----------------------
// Transfer and Delete User
// ----------------------   

exports.transferAndDeleteUser = async (req, res) => {
    const client = await db.connect();

    try {
        const { id } = req.params;
        const { transferToUserId } = req.body;

        // Validation
        if (!transferToUserId) {
            return res.status(400).json({
                success: false,
                message: "Please select a user to transfer tasks.",
            });
        }

        // User exists?
        const existingUser = await client.query(
            `SELECT id FROM "User" WHERE id = $1`,
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Transfer user exists?
        const newUser = await client.query(
            `SELECT id FROM "User" WHERE id = $1`,
            [transferToUserId]
        );

        if (newUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Transfer user not found.",
            });
        }

        // Transaction Start
        await client.query("BEGIN");

        // Transfer all assigned tasks
        await client.query(
            `
            UPDATE "Task"
            SET assigned_to = $1
            WHERE assigned_to = $2
            `,
            [transferToUserId, id]
        );

        // Delete user
        await client.query(
            `
            DELETE FROM "User"
            WHERE id = $1
            `,
            [id]
        );

        // Commit
        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Tasks transferred and user deleted successfully.",
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    } finally {
        client.release();
    }
};