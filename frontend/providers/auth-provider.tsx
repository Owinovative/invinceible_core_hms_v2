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
  const locationRetryTimersRef = React.useRef<number[]>([]);
  const lastPreciseLocationRef = React.useRef<{
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    sentAt: number;
  } | null>(null);

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
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        sentAt: Date.now(),
      };
      const previous = lastPreciseLocationRef.current;
      const movedEnough =
        !previous ||
        Math.abs(previous.latitude - next.latitude) > 0.00015 ||
        Math.abs(previous.longitude - next.longitude) > 0.00015;
      const accuracyImproved =
        !previous ||
        Number(next.accuracyMeters || 0) + 10 <
          Number(previous.accuracyMeters || Number.POSITIVE_INFINITY);
      const oldEnough = !previous || next.sentAt - previous.sentAt > 60_000;

      if (!movedEnough && !accuracyImproved && !oldEnough) return;

      lastPreciseLocationRef.current = next;

      void recordPreciseUserLocation({
        latitude: next.latitude,
        longitude: next.longitude,
        accuracyMeters: next.accuracyMeters,
      }).catch(() => undefined);
    };

    const requestLocation = (timeout = 15000, maximumAge = 0) => {
      navigator.geolocation.getCurrentPosition(sendPosition, () => undefined, {
        enableHighAccuracy: true,
        timeout,
        maximumAge,
      });
    };

    requestLocation(12000, 0);
    locationRetryTimersRef.current = [2500, 9000, 25000].map((delay) =>
      window.setTimeout(() => requestLocation(15000, 5000), delay),
    );

    locationWatchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      () => undefined,
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 10000,
      },
    );

    const handleFocus = () => requestLocation(10000, 10000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestLocation(10000, 10000);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      locationRetryTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      locationRetryTimersRef.current = [];
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
        <div className="fixed bottom-5 right-5 z-[80] w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-warning/35/25 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
          <p className="font-semibold">Session almost inactive</p>
          <p className="mt-1 text-sm text-white/70">
            For patient privacy, this portal signs out after 20 minutes without
            activity.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="rounded-lg bg-cyan-400 text-foreground hover:bg-cyan-300"
              onClick={resetInactivityTimer}
            >
              Stay signed in
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg border-white/15 bg-card/5"
              onClick={logout}
            >
              Sign out now
            </Button>
          </div>
        </div>
      ) : null}
      {user?.pendingDeactivationAt ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/65 p-4">
          <div className="w-[min(28rem,100%)] rounded-lg border bg-card p-5 text-foreground shadow-2xl">
            <p className="text-lg font-bold">Super admin deactivation request</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
                className="rounded-lg bg-destructive text-white hover:bg-red-700"
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
