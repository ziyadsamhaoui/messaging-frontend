import React from "react";
import { AppFrame } from "@/components/layout/AppFrame";

/**
 * The authenticated section's layout.
 *
 * The pre-paint layout bootstrap (sidebar state and panel width) deliberately lives in
 * the root layout instead of here: a `<script>` in a nested layout is re-created by
 * React on client-side navigation (login → `/app`) and never executed there. See
 * `app/layout.tsx`.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
