const db = require("../config/db");

// ------------
// Create task API
// ------------

exports.createTask = async (req, res) => {

    try {
        const { title, description, priority, due_date, assignedTo, } = req.body || {};

        const userId = req.user.id;
        const role = req.user.role;

        // 🔐 Only admin can create task
        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can create task"
            })
        }

        // 🧪 Validation
        if (!title || !assignedTo) {
            return res.status(400).json({
                success: false,
                message: "Title and assigned are required"
            })
        }

        if (assignedTo === userId) {
            return res.status(400).json({
                success: false,
                message: "Admin cannot assign task to themselves"
            });
        }

        const userCheck = await db.query(
            `SELECT id FROM "User" WHERE id = $1`,
            [assignedTo]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const taskResult = await db.query(
            `INSERT INTO "Task"(
            title, description, priority, due_date, status, assigned_to, assigned_by
            )
            VALUES($1,$2,$3,$4,$5,$6,$7)
            RETURNING *`,
            [title, description, priority, due_date, "pending", assignedTo, userId]
        );

        const task = taskResult.rows[0];
        
        // File attachment
        if (req.file) {

            const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

            const attachResult = await db.query(
                `INSERT INTO "TaskAttachments"
        (taskid, fileurl, uploadedby)
        VALUES ($1, $2, $3)
        RETURNING *`,
                [task.id, fileUrl, userId]
            );

        }else {

}

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            task: task
        })
    }
    catch (error) {

        console.error("CREATE TASK ERROR:", error)
        return res.status(500).json({
            success: false,
            message: "Server error"
        })

    }
}

// -------------
// GeTTask API 
// -------------

exports.getTask = async (req, res) => {
    try {

        const userId = req.user.id;
        const role = req.user.role;

        let result; // ❗ ye missing tha

        if (role === "admin") {
            result = await db.query(
                `SELECT 
                    t.*,
                    u1.name AS assigned_by_name,
                    u2.name AS assigned_to_name,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', ta.id,
                                'fileUrl', ta.fileUrl
                            )
                        ) FILTER (WHERE ta.id IS NOT NULL),
                        '[]'
                    ) AS attachments
                 FROM "Task" t
                 LEFT JOIN "User" u1 ON t.assigned_by = u1.id
                 LEFT JOIN "User" u2 ON t.assigned_to = u2.id
                 LEFT JOIN "TaskAttachments" ta ON ta.taskId = t.id
                 GROUP BY t.id, u1.name, u2.name
                 ORDER BY t.created_at DESC`
            );
        }
        else {
            result = await db.query(
                `SELECT 
                    t.*,
                    u1.name AS assigned_by_name,
                    u2.name AS assigned_to_name,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', ta.id,
                                'fileUrl', ta.fileUrl
                            )
                        ) FILTER (WHERE ta.id IS NOT NULL),
                        '[]'
                    ) AS attachments
                 FROM "Task" t
                 LEFT JOIN "User" u1 ON t.assigned_by = u1.id
                 LEFT JOIN "User" u2 ON t.assigned_to = u2.id
                 LEFT JOIN "TaskAttachments" ta ON ta.taskId = t.id
                 WHERE t.assigned_to = $1
                 GROUP BY t.id, u1.name, u2.name
                 ORDER BY t.created_at DESC`,
                [userId]
            );
        }

        res.status(200).json({
            success: true,
            count: result.rows.length,
            tasks: result.rows
        });

    } catch (error) {
        onsole.error("GET TASK ERROR:", error);;
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// -----------------
// getTask by ID API
// -----------------

exports.getTaskById = async (req, res) => {
    try {
        const userId = req.user.id;
        const taskId = req.params.id;

        const result = await db.query(
            `SELECT
                t.id,
                t.title,
                t.description,
                t.priority,
                t.status,
                t.due_date,
                t.created_at,

                u1.id AS assigned_by_id,
                u1.name AS assigned_by_name,
                u1.email AS assigned_by_email,

                u2.id AS assigned_to_id,
                u2.name AS assigned_to_name,
                u2.email AS assigned_to_email

             FROM "Task" t

             LEFT JOIN "User" u1
                ON t.assigned_by = u1.id

             LEFT JOIN "User" u2
                ON t.assigned_to = u2.id

             WHERE t.id = $1
             AND t.assigned_to = $2`,
            [taskId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found or you are not authorized to view this task"
            });
        }

        const task = result.rows[0];

        res.status(200).json({
            success: true,
            task
        });

    } catch (error) {
        console.error("GET TASK BY ID ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ---------------
// Update Task API 
// ---------------

exports.updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const role = req.user.role;

        let { title, description, status } = req.body;

        if (!title && !description && !status && !req.file) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required"
            });
        }

        if (status) {
            status = status.toLowerCase();

            if (status === "done") status = "completed";
            if (status === "inprogress") status = "in-progress";
        }

        const allowedStatus = ["pending", "in-progress", "completed"];

        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        let fields = [];
        let values = [];
        let index = 1;

        if (title) {
            fields.push(`title = $${index++}`);
            values.push(title);
        }

        if (description) {
            fields.push(`description = $${index++}`);
            values.push(description);
        }

        if (status) {
            fields.push(`status = $${index++}`);
            values.push(status);
        }

        fields = fields.join(", ");

        let query;

        if (role === "admin") {
            query = `
                UPDATE "Task"
                SET ${fields}
                WHERE id = $${index}
                RETURNING *
            `;
            values.push(taskId);
        } else {
            query = `
                UPDATE "Task"
                SET ${fields}
                WHERE id = $${index} AND assigned_to = $${index + 1}
                RETURNING *
            `;
            values.push(taskId, userId);
        }

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found or unauthorized"
            });
        }

        if (status === "completed") {


            await db.query(
                `INSERT INTO "TaskHistory"("taskId", "updatedBy", "status")
         VALUES($1, $2, $3)
         RETURNING *`,
                [taskId, userId, status]
            );

        }

        // File support Logic 

        if (req.file) {

            const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

            await db.query(
                `INSERT INTO "TaskAttachments"(taskId,fileUrl,uploadedBy)
                values($1,$2,$3)`,
                [taskId, fileUrl, userId]
            );
        }

        return res.status(200).json({
            success: true,
            message: "Task updated successfully",
            task: result.rows[0],
            body: req.body
        });

    } catch (error) {
        console.error("UPDATE TASK ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

// ---------------
// Delete Task API 
// ---------------

exports.deleteTask = async (req, res) => {

    try {
        const taskId = req.params.id;
        const role = req.user.role;

        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can delete task"
            })
        }

        // ✅ delete query
        const result = await db.query(
            `DELETE FROM "Task"
             WHERE id = $1
             RETURNING *`,
            [taskId]
        );

        // ❗ task exist nahi
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task deleted successfully",
            task: result.rows[0]
        });
    }

    catch (error) {

        console.error("DELETE TASK ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        })
    }
}

// ----------------------
// Get All Task History API
// ----------------------

exports.getTaskHistory = async (req, res) => {
    try {
        const role = req.user.role;

        // 🔐 Only admin can view complete task history
        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can view task history"
            });
        }

        const result = await db.query(`
            SELECT
                th.id,
                th."taskId",
                th."updatedBy",
                u.name AS "userName",
                u.email AS "userEmail",
                t.title AS task,
                th.status,
                th."updatedAt"
            FROM "TaskHistory" th

            LEFT JOIN "User" u
                ON th."updatedBy" = u.id

            LEFT JOIN "Task" t
                ON th."taskId" = t.id

            WHERE th.status = 'completed'

            ORDER BY th."updatedAt" DESC
        `);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            history: result.rows
        });

    } catch (error) {

        console.error("GET TASK HISTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// ----------------------
// Get Unread Task History Count
// ----------------------

exports.getUnreadTaskHistoryCount = async (req, res) => {
    try {
        const role = req.user.role;

        // Only admin can see notification count
        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can view task notifications"
            });
        }

        const result = await db.query(`
            SELECT COUNT(*) AS count
            FROM "TaskHistory"
            WHERE status = 'completed'
            AND "isRead" = false
        `);

        return res.status(200).json({
            success: true,
            count: Number(result.rows[0].count)
        });

    } catch (error) {
        console.error(
            "GET UNREAD TASK HISTORY COUNT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// ----------------------
// Mark Task History as Read
// ----------------------

exports.markTaskHistoryAsRead = async (req, res) => {
    try {
        const role = req.user.role;

        // Only admin can mark notifications as read
        if (role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can mark task notifications as read"
            });
        }

        const result = await db.query(`
            UPDATE "TaskHistory"
            SET "isRead" = true
            WHERE "isRead" = false
            AND status = 'completed'
            RETURNING id
        `);

        return res.status(200).json({
            success: true,
            message: "Task history notifications marked as read",
            count: result.rows.length
        });

    } catch (error) {
        console.error(
            "MARK TASK HISTORY AS READ ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ---------------
// Upload File API 
// ---------------
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        return res.status(200).json({

            success: true,
            message: "File uploaded successfully",
            fileUrl: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`

        });

    } catch (error) {
        console.error("UPLOAD FILE ERROR:", error);;
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};