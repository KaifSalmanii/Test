"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiGet, apiSend, type ApiAccount } from "@/lib/clientApi";

type AuthState = {
  loading: boolean;
  configured: boolean;
  account: ApiAccount | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [account, setAccount] = useState<ApiAccount | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<{ configured: boolean; account: ApiAccount | null }>(
        "/api/auth/status"
      );
      setConfigured(data.configured);
      setAccount(data.account);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiSend("/api/auth/logout", "POST");
    setAccount(null);
  }, []);

  const value = useMemo(
    () => ({ loading, configured, account, refresh, logout }),
    [loading, configured, account, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
