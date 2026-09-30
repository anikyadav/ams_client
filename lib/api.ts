import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "audit_practice_token";
export const AUTH_EXPIRED_EVENT = "audit-practice:auth-expired";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      error.config?.url !== "/auth/login"
    ) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

export type BackendErrorBody = {
  message?: string | Array<{ message?: string } | string>;
};

export function apiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Something went wrong";
  }
  const data = error.response?.data as BackendErrorBody | undefined;
  if (Array.isArray(data?.message)) {
    const parts = data!.message.map((item) =>
      typeof item === "string" ? item : item?.message,
    );
    return parts.filter(Boolean).join(", ");
  }
  if (typeof data?.message === "string") return data.message;
  if (error.code === "ECONNABORTED") return "Request timed out";
  if (!error.response) return "Cannot reach the server. Is it running?";
  return "Request failed";
}
