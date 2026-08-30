import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { store } from "@/redux/store";
import { logout } from "@/redux/slices/authSlice";

// --------------------------------------------------
// Main API instance
// --------------------------------------------------

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});



// --------------------------------------------------
// Request Interceptor
// --------------------------------------------------

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --------------------------------------------------
// Response Interceptor
// --------------------------------------------------

api.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error: AxiosError) => {

    // ------------------------------------------------
    // Access Token expired / invalid
    // ------------------------------------------------

   if (
  error.response?.status === 401 &&
  error.config?.url !== "/authRoutes/login"
) {


  // Clear Redux authentication state
  store.dispatch(logout());

  // Notify application
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("session-expired"));
  }
}

    return Promise.reject(error);
  }
);

export default api;