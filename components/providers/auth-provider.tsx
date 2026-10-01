"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, TOKEN_KEY, AUTH_EXPIRED_EVENT } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string, signal?: AbortSignal) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let ignore = false;
    const token = window.localStorage.getItem(TOKEN_KEY);
    (token ? api.get<User>("/auth/me") : Promise.resolve({ data: null }))
      .then((response) => {
        if (!ignore) {
          setUser(response.data);
          setStatus(response.data ? "authenticated" : "anonymous");
        }
      })
      .catch(() => {
        if (!ignore) {
          window.localStorage.removeItem(TOKEN_KEY);
          setUser(null);
          setStatus("anonymous");
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, signal?: AbortSignal) => {
      const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      }, { timeout: 15_000, signal });
      signal?.throwIfAborted();
      window.localStorage.setItem(TOKEN_KEY, response.data.accessToken);
      await queryClient.cancelQueries();
      queryClient.clear();
      setUser(response.data.user);
      setStatus("authenticated");
      return response.data.user;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("anonymous");
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
