import React from "react";
import { AppFrame } from "@/components/layout/AppFrame";

/**
 * Runs before the first paint and mirrors the persisted sidebar choice onto the
 * document element, where CSS reads it. Without it the server's HTML — rendered
 * with the default width — would be painted first and the rail would snap to its
 * real width a frame later.
 *
 * It reads the same key as the store and is wrapped in try/catch because storage
 * can be unavailable; on failure the attribute is simply left unset and the default
 * width applies.
 */
const SIDEBAR_BOOTSTRAP = `try{var k="badrlink.sidebar-collapsed",s=window.localStorage.getItem(k);if(s===null){s=String(window.matchMedia("(max-width: 1439px)").matches);}document.documentElement.dataset.sidebar=s==="true"?"collapsed":"expanded";}catch(e){}`;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOTSTRAP }} />
      <AppFrame>{children}</AppFrame>
    </>
  );
}
