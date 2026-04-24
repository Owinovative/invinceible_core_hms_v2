"use client";

import * as React from "react";
import type { AuthAllowedBranch } from "@/types/auth";
import { useAuth } from "@/providers/auth-provider";

type ScopeContextValue = {
  facilityId?: number;
  facilityName?: string | null;
  selectedBranchId?: number;
  selectedBranchName?: string | null;
  availableBranches: AuthAllowedBranch[];
  canSwitchBranches: boolean;
  setSelectedBranchId: (branchId?: number) => void;
};

const ScopeContext = React.createContext<ScopeContextValue | null>(null);

const STORAGE_KEY = "hms_selected_branch_id";

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const availableBranches = React.useMemo(() => {
    const map = new Map<number, AuthAllowedBranch>();

    for (const branch of user?.allowedBranches ?? []) {
      map.set(branch.id, branch);
    }

    if (user?.homeBranchId) {
      map.set(user.homeBranchId, {
        id: user.homeBranchId,
        name: user.homeBranchName || `Branch ${user.homeBranchId}`,
        code: null,
        facilityId: user.homeFacilityId || 0,
      });
    }

    return Array.from(map.values());
  }, [user]);

  const canSwitchBranches = !!user?.canAccessAllBranchesInFacility;

  const [selectedBranchId, setSelectedBranchIdState] = React.useState<
    number | undefined
  >(undefined);

  React.useEffect(() => {
    if (!user) {
      setSelectedBranchIdState(undefined);
      return;
    }

    if (!user.canAccessAllBranchesInFacility) {
      setSelectedBranchIdState(user.homeBranchId ?? undefined);
      return;
    }

    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;

    const parsed = stored ? Number(stored) : undefined;

    if (!parsed) {
      setSelectedBranchIdState(undefined);
      return;
    }

    const isAllowed =
      availableBranches.length === 0 ||
      availableBranches.some((branch) => branch.id === parsed);

    if (isAllowed) {
      setSelectedBranchIdState(parsed);
      return;
    }

    setSelectedBranchIdState(undefined);
  }, [user, availableBranches]);

  const setSelectedBranchId = React.useCallback(
    (branchId?: number) => {
      if (!user) return;

      if (!user.canAccessAllBranchesInFacility) {
        setSelectedBranchIdState(user.homeBranchId ?? undefined);
        return;
      }

      if (!branchId) {
        setSelectedBranchIdState(undefined);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        return;
      }

      if (availableBranches.length > 0) {
        const isAllowed = availableBranches.some(
          (branch) => branch.id === branchId,
        );
        if (!isAllowed) return;
      }

      setSelectedBranchIdState(branchId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(branchId));
      }
    },
    [user, availableBranches],
  );

  const selectedBranchName = React.useMemo(() => {
    if (!user) return null;

    if (!user.canAccessAllBranchesInFacility) {
      return (
        user.homeBranchName || (user.homeFacilityId ? "Facility wide" : null)
      );
    }

    if (!selectedBranchId) {
      return "All branches";
    }

    return (
      availableBranches.find((branch) => branch.id === selectedBranchId)
        ?.name || `Branch ${selectedBranchId}`
    );
  }, [user, availableBranches, selectedBranchId]);

  const value = React.useMemo<ScopeContextValue>(
    () => ({
      facilityId: user?.homeFacilityId ?? undefined,
      facilityName: user?.homeFacilityName ?? null,
      selectedBranchId: user?.canAccessAllBranchesInFacility
        ? selectedBranchId
        : (user?.homeBranchId ?? undefined),
      selectedBranchName,
      availableBranches,
      canSwitchBranches,
      setSelectedBranchId,
    }),
    [
      user,
      selectedBranchId,
      selectedBranchName,
      availableBranches,
      canSwitchBranches,
      setSelectedBranchId,
    ],
  );

  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

export function useScope() {
  const context = React.useContext(ScopeContext);

  if (!context) {
    throw new Error("useScope must be used within ScopeProvider");
  }

  return context;
}
