'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SidebarPreference = {
  open: boolean;
  ready: boolean;
  toggle: () => void;
};

const SidebarPreferenceContext = createContext<SidebarPreference | null>(null);

export function SidebarPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem('jw-sidebar') !== '0');
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const value = useMemo<SidebarPreference>(() => ({
    open,
    ready,
    toggle: () => setOpen((current) => {
      const next = !current;
      localStorage.setItem('jw-sidebar', next ? '1' : '0');
      return next;
    }),
  }), [open, ready]);

  return <SidebarPreferenceContext.Provider value={value}>{children}</SidebarPreferenceContext.Provider>;
}

export function useSidebarPreference() {
  const value = useContext(SidebarPreferenceContext);
  if (!value) throw new Error('useSidebarPreference must be used inside SidebarPreferenceProvider');
  return value;
}

