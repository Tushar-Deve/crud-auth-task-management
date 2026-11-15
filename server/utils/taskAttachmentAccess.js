function createTaskAttachmentAuthorization(database) {
    return async function authorizeTaskAttachmentUpload(req, res, next) {
        const taskId = String(req.params.id || "");
        if (!/^\d+$/.test(taskId)) {
            return res.status(404).json({ success: false, message: "Task not found or unauthorized" });
        }

        try {
            const result = req.user.role === "admin"
                ? await database.query(`SELECT id FROM "Task" WHERE id = $1`, [taskId])
                : await database.query(
                    `SELECT id FROM "Task" WHERE id = $1 AND assigned_to = $2`,
                    [taskId, req.user.id]
                );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Task not found or unauthorized" });
            }
            return next();
        } catch (error) {
            console.error("TASK ATTACHMENT AUTHORIZATION ERROR:", error.code || error.name);
            return res.status(500).json({ success: false, message: "Unable to verify task access" });
        }
    };
}

module.exports = { createTaskAttachmentAuthorization };
