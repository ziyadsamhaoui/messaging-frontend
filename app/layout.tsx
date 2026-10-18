import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Newsreader, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "@/components/ui/Toast";

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const bodyFont = Newsreader({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Humanist sans reserved for interface chrome: controls, labels, navigation and
// metadata. The serif body face stays for prose so the visual identity is kept.
const uiFont = Source_Sans_3({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BadrLink",
  description: "Real-time messaging, rooted in calm.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.png" },
};

/**
 * `viewportFit: "cover"` is what makes `env(safe-area-inset-bottom)` non-zero on a
 * phone with a home indicator, which the bottom navigation uses to stay tappable.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A3A20",
};

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
 *
 * It lives in the root layout, at the top of `<body>`, for two reasons. The parser runs
 * it before it reaches the app's markup, so the attributes are already set when the
 * shell is first painted. And the root layout is mounted once per document: a script in
 * a nested layout would be re-created by React on client-side navigation (the login →
 * `/app` path), where scripts are never executed and React logs a warning.
 */
const LAYOUT_BOOTSTRAP = `try{var k="badrlink.sidebar-collapsed",s=window.localStorage.getItem(k);if(s===null){s=String(window.matchMedia("(max-width: 1439px)").matches);}document.documentElement.dataset.sidebar=s==="true"?"collapsed":"expanded";}catch(e){}
try{var w=parseFloat(window.localStorage.getItem("badrlink.panel-width"));if(!isFinite(w)){w=340;}var ceil=Math.max(280,Math.min(480,Math.round(window.innerWidth*0.4)));w=Math.min(Math.max(Math.round(w),280),ceil);document.documentElement.style.setProperty("--app-panel-width",w+"px");document.documentElement.dataset.panelWidth=String(w);}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * `suppressHydrationWarning` because LAYOUT_BOOTSTRAP writes `data-sidebar`,
     * `data-panel-width` and the `--app-panel-width` inline style onto this element
     * before React hydrates. The values are intentional and React leaves them in place;
     * the prop only silences the mismatch report for this element.
     */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} ${uiFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: LAYOUT_BOOTSTRAP }} />
        <Providers>
          <ToastProvider>{children}</ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
