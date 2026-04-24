"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-storage";
import { getMe, loginUser } from "@/services/auth-service";
import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setTokenState] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshMe = React.useCallback(async () => {
  const existingToken = getAccessToken();

  if (!existingToken) {
    setUser(null);
    setTokenState(null);
    setIsLoading(false);
    return;
  }

  try {
    setTokenState(existingToken);
    const me = await getMe();
    setUser({
      ...me,
      id: me.id ?? me.userId,
      userId: me.userId ?? me.id,
      roleId: me.roleId ?? me.role?.id,
      roleCode: me.roleCode ?? me.role?.code ?? null,
    });
  } catch {
    clearAccessToken();
    setUser(null);
    setTokenState(null);
  } finally {
    setIsLoading(false);
  }
}, []);
  React.useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = React.useCallback(
    async (payload: { username: string; password: string }) => {
      setIsLoading(true);
      try {
        const result = await loginUser(payload);

        setAccessToken(result.accessToken);
        setTokenState(result.accessToken);

        setUser({
          ...result.user,
          id: result.user.id ?? result.user.userId,
          userId: result.user.userId ?? result.user.id,
          roleId: result.user.roleId ?? result.user.role?.id,
          roleCode: result.user.roleCode ?? result.user.role?.code ?? null,
        });

      } catch (error) {
        console.error("Login failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );
  const logout = React.useCallback(() => {
    clearAccessToken();
    setUser(null);
    setTokenState(null);
    router.push("/login");
  }, [router]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      refreshMe,
    }),
    [user, token, isLoading, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
