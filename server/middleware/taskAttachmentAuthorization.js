const db = require("../config/db");
const { createTaskAttachmentAuthorization } = require("../utils/taskAttachmentAccess");

module.exports = createTaskAttachmentAuthorization(db);
