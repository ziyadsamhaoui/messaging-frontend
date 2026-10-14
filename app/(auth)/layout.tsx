import React from "react";
import { AuthPage } from "@/components/auth/AuthPage";

/**
 * `/login` and `/register` are pages in this route group, so they share this
 * layout — and the layout is what actually renders the auth UI.
 *
 * That placement is deliberate. When the card lived in each page, switching modes
 * navigated between two different page components, which unmounted the card:
 * the email the visitor had typed was lost, and focus fell back to <body> so the
 * arrow keys stopped working on the segmented control. A shared layout stays
 * mounted across the switch and only the (empty) page segment is swapped, so the
 * card, its values and its focus all survive a mode change naturally.
 *
 * The route group does not affect either URL: this is still `/login` and
 * `/register`.
 */
export default function AuthGroupLayout() {
  return <AuthPage />;
}
