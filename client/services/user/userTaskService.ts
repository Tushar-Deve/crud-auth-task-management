import api from "../axios";

export const getMyTasks = async () => {
  const response = await api.get("/taskRoutes/gettask");

  return response.data;
};

export const getTaskById = async (
  taskId: number | string
) => {
  const response = await api.get(`/taskRoutes/gettask/${taskId}`);

  return response.data;
};

export const submitTask = async (
  taskId: number | string
) => {
  const response = await api.patch(
    `/taskRoutes/updatetask/${taskId}`,
    {
      status: "completed",
    }
  );

  return response.data;
};

export const downloadTaskAttachment = async (attachmentId: number | string) => {
  const id = String(attachmentId);
  if (!/^\d+$/.test(id)) {
    throw new Error("Attachment not found");
  }

  const response = await api.get(`/taskRoutes/attachments/${id}`, {
    responseType: "blob",
  });
  return response.data as Blob;
};
