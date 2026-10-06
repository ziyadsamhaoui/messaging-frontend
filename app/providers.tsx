"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import { createQueryClient } from "../lib/queryClient";
import { AuthProvider } from "../context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
