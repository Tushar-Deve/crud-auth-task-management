import api from "./axios";

export const getAllUsers = async (token: string) => {
  const response = await api.get("/adminRoutes/getAllUsers", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const createUser = async (
  userData: {
    name: string;
    email: string;
    password: string;
  },
  token: string
) => {
  const response = await api.post(
    "/adminRoutes/createUser",
    userData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const updateUser = async (
  id: string,
  userData: {
    name: string;
    email: string;
    password: string;
  },
  token: string
) => {
  const response = await api.put(
    `/adminRoutes/updateUser/${id}`,
    userData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ------------------
// Delete User service
// ------------------

export const deleteUser = async (
  id: string,
  token: string
) => {
  const response = await api.delete(
    `/adminRoutes/deleteUser/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ------------------
// Reassign Users service
// ------------------

export const getReassignUsers = async (
  id: string,
  token: string
) => {
  const response = await api.get(
    `/adminRoutes/reassignUsers/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ------------------
// trasfer and delete user service
// ------------------

export const transferAndDeleteUser = async (
  userId: string,
  transferToUserId: string,
  token: string
) => {
  const response = await api.post(
    `/adminRoutes/transferAndDelete/${userId}`,
    {
      transferToUserId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};