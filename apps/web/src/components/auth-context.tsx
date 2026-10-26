'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppNotification, PublicAccount, mockAccounts } from '@jongwen/shared';
import { MockAccountHint, api, clearStoredAuth, getStoredToken, setStoredAuth } from '@/lib/api';

const fallbackAccounts: MockAccountHint[] = mockAccounts.map(({ password: _password, pin, ...rest }) => ({
  ...rest,
  hasPin: !!pin,
}));

interface AuthContextValue {
  account: PublicAccount | null;
  accounts: MockAccountHint[];
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loginWithCredentials: (username: string, password: string) => Promise<PublicAccount>;
  registerAccount: (payload: {
    name: string;
    phone: string;
    password: string;
    otp?: string;
    lineName?: string;
    department?: string;
  }) => Promise<PublicAccount>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<MockAccountHint[]>(fallbackAccounts);
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    if (!getStoredToken()) {
      setNotifications([]);
      return;
    }
    try {
      const list = await api.notifications();
      setNotifications(list);
    } catch {
      // ignore
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const all = await api.listMockAccounts();
      setAccounts(all);
      if (getStoredToken()) {
        const me = await api.me();
        setAccount(me);
        await refreshNotifications();
      } else {
        setAccount(null);
        setNotifications([]);
      }
    } catch {
      // fallback
    }
  }, [refreshNotifications]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await api.listMockAccounts();
        if (active) setAccounts(list);
      } catch {
        // use fallbackAccounts
      }
      const existing = getStoredToken();
      if (existing) {
        try {
          const me = await api.me();
          if (active) setAccount(me);
          await refreshNotifications();
        } catch {
          clearStoredAuth();
          if (active) setAccount(null);
        }
      } else {
        if (active) setAccount(null);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshNotifications]);

  const loginWithCredentials = useCallback(
    async (username: string, password: string) => {
      const res = await api.login({ username, password });
      setStoredAuth(res.token, res.account.id);
      setAccount(res.account);
      await refreshNotifications();
      return res.account;
    },
    [refreshNotifications],
  );

  const registerAccount = useCallback(
    async (payload: {
      name: string;
      phone: string;
      password: string;
      otp?: string;
      lineName?: string;
      department?: string;
    }) => {
      const res = await api.register(payload);
      setStoredAuth(res.token, res.account.id);
      setAccount(res.account);
      const list = await api.listMockAccounts();
      setAccounts(list);
      await refreshNotifications();
      return res.account;
    },
    [refreshNotifications],
  );

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    clearStoredAuth();
    setAccount(null);
    setNotifications([]);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await api.readAllNotifications();
    await refreshNotifications();
  }, [refreshNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        account,
        accounts,
        notifications,
        unreadCount,
        loading,
        loginWithCredentials,
        registerAccount,
        logout,
        refreshMe,
        refreshNotifications,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function roleHomePath(role?: PublicAccount['role']): string {
  switch (role) {
    case 'STAFF':
      return '/staff';
    case 'APPROVER_L2':
    case 'APPROVER_L1':
      return '/approver';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}
