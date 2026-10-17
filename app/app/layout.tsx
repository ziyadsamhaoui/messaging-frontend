import React from "react";
import { AppFrame } from "@/components/layout/AppFrame";

/**
 * Runs before the first paint and mirrors two persisted layout choices onto the
 * document element, where CSS reads them: the sidebar's collapsed state and the section
 * panel's width. Without it the server's HTML — rendered with the defaults — would be
 * painted first and both would snap to their real sizes a frame later.
 *
 * It reads the same keys as the store and is wrapped in try/catch because storage can be
 * unavailable; on failure the attribute is left unset and the defaults apply.
 *
 * The panel width is clamped here too, against the same ceiling the handle uses
 * (480 px or 40% of the viewport), so a width remembered on a large screen cannot be
 * painted too wide for the screen it is being restored on.
 */
const SIDEBAR_BOOTSTRAP = `try{var k="badrlink.sidebar-collapsed",s=window.localStorage.getItem(k);if(s===null){s=String(window.matchMedia("(max-width: 1439px)").matches);}document.documentElement.dataset.sidebar=s==="true"?"collapsed":"expanded";}catch(e){}
try{var w=parseFloat(window.localStorage.getItem("badrlink.panel-width"));if(!isFinite(w)){w=340;}var ceil=Math.max(280,Math.min(480,Math.round(window.innerWidth*0.4)));w=Math.min(Math.max(Math.round(w),280),ceil);document.documentElement.style.setProperty("--app-panel-width",w+"px");document.documentElement.dataset.panelWidth=String(w);}catch(e){}`;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOTSTRAP }} />
      <AppFrame>{children}</AppFrame>
    </>
  );
}
