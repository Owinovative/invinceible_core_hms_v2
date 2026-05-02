"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";
import {
  acceptOwnDeactivation,
  getMe,
  loginUser,
} from "@/services/auth-service";
import {
  markUserLocationLogout,
  recordPreciseUserLocation,
} from "@/services/user-location-service";
import type { AuthUser } from "@/types/auth";

const AUTO_LOGOUT_MS = 20 * 60 * 1000;
const AUTO_LOGOUT_WARNING_MS = 60 * 1000;
const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

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
  const [autoLogoutWarning, setAutoLogoutWarning] = React.useState(false);
  const warningTimerRef = React.useRef<number | null>(null);
  const logoutTimerRef = React.useRef<number | null>(null);
  const locationWatchRef = React.useRef<number | null>(null);

  const clearAutoLogoutTimers = React.useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const normalizeUser = React.useCallback((authUser: AuthUser): AuthUser => {
    return {
      ...authUser,
      id: authUser.id ?? authUser.userId,
      userId: authUser.userId ?? authUser.id,
      roleId: authUser.roleId ?? authUser.role?.id,
      roleCode: authUser.roleCode ?? authUser.role?.code ?? null,
    };
  }, []);

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
      setUser(normalizeUser(me));
    } catch {
      clearAccessToken();
      setUser(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, [normalizeUser]);

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

        const scopedUser = await getMe();
        setUser(
          normalizeUser({
            ...result.user,
            ...scopedUser,
            role: scopedUser.role ?? result.user.role,
          }),
        );
      } catch (error) {
        console.error("Login failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [normalizeUser],
  );

  const logout = React.useCallback(() => {
    clearAutoLogoutTimers();
    setAutoLogoutWarning(false);
    if (getAccessToken()) {
      void markUserLocationLogout().catch(() => undefined);
    }
    clearAccessToken();
    setUser(null);
    setTokenState(null);
    router.push("/login");
  }, [clearAutoLogoutTimers, router]);

  const resetInactivityTimer = React.useCallback(() => {
    if (!token || !user) return;

    clearAutoLogoutTimers();
    setAutoLogoutWarning(false);

    warningTimerRef.current = window.setTimeout(() => {
      setAutoLogoutWarning(true);
    }, AUTO_LOGOUT_MS - AUTO_LOGOUT_WARNING_MS);

    logoutTimerRef.current = window.setTimeout(() => {
      logout();
    }, AUTO_LOGOUT_MS);
  }, [clearAutoLogoutTimers, logout, token, user]);

  React.useEffect(() => {
    if (!token || !user) {
      clearAutoLogoutTimers();
      setAutoLogoutWarning(false);
      return;
    }

    resetInactivityTimer();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetInactivityTimer, {
        passive: true,
      });
    }

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetInactivityTimer);
      }
      clearAutoLogoutTimers();
    };
  }, [clearAutoLogoutTimers, resetInactivityTimer, token, user]);

  React.useEffect(() => {
    if (!token || !user || !("geolocation" in navigator)) return;

    const sendPosition = (position: GeolocationPosition) => {
      void recordPreciseUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }).catch(() => undefined);
    };

    navigator.geolocation.getCurrentPosition(sendPosition, () => undefined, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    locationWatchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      () => undefined,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000,
      },
    );

    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };
  }, [token, user]);

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

  return (
    <AuthContext.Provider value={value}>
      {children}
      {autoLogoutWarning && value.isAuthenticated ? (
        <div className="fixed bottom-5 right-5 z-[80] w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-amber-300/25 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
          <p className="font-semibold">Session almost inactive</p>
          <p className="mt-1 text-sm text-white/70">
            For patient privacy, this portal signs out after 20 minutes without
            activity.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              onClick={resetInactivityTimer}
            >
              Stay signed in
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg border-white/15 bg-white/5"
              onClick={logout}
            >
              Sign out now
            </Button>
          </div>
        </div>
      ) : null}
      {user?.pendingDeactivationAt ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/65 p-4">
          <div className="w-[min(28rem,100%)] rounded-lg border bg-white p-5 text-slate-950 shadow-2xl">
            <p className="text-lg font-bold">Super admin deactivation request</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Another authorized administrator has requested to deactivate this
              super admin account. For security, it will only take effect after
              you accept it.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={() => setUser((current) =>
                  current
                    ? {
                        ...current,
                        pendingDeactivationAt: null,
                        pendingDeactivationReason: null,
                      }
                    : current,
                )}
              >
                Review later
              </Button>
              <Button
                type="button"
                className="rounded-lg bg-red-600 text-white hover:bg-red-700"
                onClick={async () => {
                  await acceptOwnDeactivation();
                  logout();
                }}
              >
                Accept and deactivate
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
