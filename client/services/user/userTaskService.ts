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