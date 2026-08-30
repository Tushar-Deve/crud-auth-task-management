import api from "./axios";

export interface CreateTaskData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  assignedTo: string;
  file?: File | null;
}

export const createTask = async (
  taskData: CreateTaskData,
  token: string
) => {
  const formData = new FormData();

  formData.append("title", taskData.title);
  formData.append("description", taskData.description);
  formData.append("priority", taskData.priority);
  formData.append("due_date", taskData.due_date);
  formData.append("assignedTo", taskData.assignedTo);

  if (taskData.file) {
    formData.append("file", taskData.file);
  }

  const response = await api.post(
    "/taskRoutes/createtask",
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// -------------------
//  Get Task Service
// -------------------

export const getTasks = async (token: string) => {
  const response = await api.get("/taskRoutes/gettask", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// ----------------
// Get task Service 
// ----------------

export const getTaskHistory = async () => {
    const response = await api.get(
        `/taskRoutes/gettaskhistory`
    );

    return response.data;
};

// ------------
// Updatetask
// ---------`---

export const updateTask = async (
  id: string,
  taskData: {
    title?: string;
    description?: string;
    status?: "pending" | "in-progress" | "completed";
    file?: File | null;
  },
  token: string
) => {
  const formData = new FormData();

  if (taskData.title !== undefined) {
    formData.append("title", taskData.title);
  }

  if (taskData.description !== undefined) {
    formData.append("description", taskData.description);
  }

  if (taskData.status !== undefined) {
    formData.append("status", taskData.status);
  }

  if (taskData.file) {
    formData.append("file", taskData.file);
  }

  const response = await api.patch(
    `/taskRoutes/updatetask/${id}`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ---------------
// Delete task service 
// =================

export const deleteTask = async (
  id: string,
  token: string
) => {
  const response = await api.delete(
    `/taskRoutes/deletetask/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ----------------------
// Get Unread Task History Count
// ----------------------

export const getUnreadTaskHistoryCount = async () => {
  const response = await api.get(
    "/taskRoutes/taskhistory/unread-count"
  );

  return response.data;
};


// ----------------------
// Mark Task History As Read
// ----------------------

export const markTaskHistoryAsRead = async () => {
  const response = await api.patch(
    "/taskRoutes/taskhistory/mark-read"
  );

  return response.data;
};