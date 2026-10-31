import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

import { store } from "@/redux/store";
import { logout, updateAccessToken } from "@/redux/slices/authSlice";

type RetryableRequestConfig = InternalAxiosRequestConfig & { _refreshRetried?: boolean };
let refreshRequest: Promise<string | null> | null = null;

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

    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const url = originalRequest?.url || "";
    const shouldRefresh = error.response?.status === 401 && originalRequest &&
      !originalRequest._refreshRetried &&
      !["/authRoutes/login", "/authRoutes/refresh", "/authRoutes/logout"].some((path) => url.includes(path));

    if (shouldRefresh) {
      originalRequest._refreshRetried = true;
      if (!refreshRequest) {
        refreshRequest = api.post("/authRoutes/refresh", {}, { withCredentials: true })
          .then((response) => {
            const token = response.data?.accessToken;
            if (typeof token !== "string" || !token) return null;
            store.dispatch(updateAccessToken(token));
            return token;
          })
          .catch(() => null)
          .finally(() => { refreshRequest = null; });
      }

      const token = await refreshRequest;
      if (token) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api.request(originalRequest as AxiosRequestConfig);
      }
    }

    if (error.response?.status === 401 && !url.includes("/authRoutes/login")) {
      store.dispatch(logout());
      if (typeof window !== "undefined") window.dispatchEvent(new Event("session-expired"));
    }

    return Promise.reject(error);
  }
);

export default api;
