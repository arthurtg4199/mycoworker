"use client";

import { createContext, useContext } from "react";

export type SessionValue = {
  demoMode: boolean;
  email: string | null;
};

const SessionContext = createContext<SessionValue>({
  demoMode: false,
  email: null,
});

export function SessionProvider({
  value,
  children,
}: {
  value: SessionValue;
  children: React.ReactNode;
}) {
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  return useContext(SessionContext);
}
