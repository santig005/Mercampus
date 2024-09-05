"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }) {
  return (
    <SessionProvider session={null}>
      {children}
    </SessionProvider>
  );
}

export default Providers;
