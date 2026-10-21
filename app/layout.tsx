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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A3A20",
};

const LAYOUT_BOOTSTRAP = `try{var k="badrlink.sidebar-collapsed",s=window.localStorage.getItem(k);if(s===null){s=String(window.matchMedia("(max-width: 1439px)").matches);}document.documentElement.dataset.sidebar=s==="true"?"collapsed":"expanded";}catch(e){}
try{var w=parseFloat(window.localStorage.getItem("badrlink.panel-width"));if(!isFinite(w)){w=340;}var ceil=Math.max(280,Math.min(480,Math.round(window.innerWidth*0.4)));w=Math.min(Math.max(Math.round(w),280),ceil);document.documentElement.style.setProperty("--app-panel-width",w+"px");document.documentElement.dataset.panelWidth=String(w);}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
