import api from "./axios";

export const getDashboard = async () => {
  const response = await api.get("/adminRoutes/dashboard");

  return response.data;
};